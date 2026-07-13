const { Op } = require('sequelize');
const {
  InvestmentDistribution,
  InvestmentDistributionLine,
  InvestmentTransaction,
  InvestmentPartnerAllocation,
  InvestmentAsset,
} = require('../../models');
const { sequelize } = require('../../config/database');
const { companyWhere, withCompanyId } = require('../../utils/companyScope');
const { allocateInvestmentNumber } = require('./investmentDocumentNumber.service');
const allocationService = require('./investmentPartnerAllocation.service');
const postingService = require('./investmentPosting.service');
const { round2 } = require('./investmentFinancePostingUtils');

const DISTRIBUTABLE_TYPES = ['DIVIDEND', 'INTEREST', 'SELL'];

function mapDistributionType(txnType) {
  if (txnType === 'DIVIDEND') return 'DIVIDEND';
  if (txnType === 'INTEREST') return 'INTEREST';
  if (txnType === 'SELL') return 'SELL_PROFIT';
  return null;
}

async function getDistribution(req, distributionId) {
  const dist = await InvestmentDistribution.findOne({
    where: { id: distributionId, ...companyWhere(req) },
    include: [
      { model: InvestmentDistributionLine, as: 'lines' },
      { model: InvestmentAsset, as: 'asset', attributes: ['investmentCode', 'investmentName'] },
      { model: InvestmentTransaction, as: 'sourceTransaction', attributes: ['transactionNo', 'transactionType', 'baseAmount'] },
    ],
  });
  if (!dist) {
    const err = new Error('Distribution not found');
    err.statusCode = 404;
    throw err;
  }
  return dist;
}

async function listDistributions(req, filters = {}) {
  const { testDataWhere, parsePagination, paginationMeta } = require('./shared/investmentQueryScope');
  const { page, limit, offset } = parsePagination(filters, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (filters.postingStatus) where.postingStatus = filters.postingStatus;
  if (filters.distributionType) where.distributionType = filters.distributionType;
  const { count, rows } = await InvestmentDistribution.findAndCountAll({
    where,
    include: [
      { model: InvestmentDistributionLine, as: 'lines' },
      { model: InvestmentAsset, as: 'asset', attributes: ['investmentCode', 'investmentName'] },
      { model: InvestmentTransaction, as: 'sourceTransaction', attributes: ['transactionNo', 'transactionType'] },
    ],
    order: [['distributionDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { distributions: rows, pagination: paginationMeta(count, page, limit) };
}

async function prepareFromTransaction(req, transactionId) {
  const txn = await InvestmentTransaction.findOne({
    where: { id: transactionId, ...companyWhere(req) },
    include: [{ model: InvestmentAsset, as: 'asset' }],
  });
  if (!txn) {
    const err = new Error('Transaction not found');
    err.statusCode = 404;
    throw err;
  }
  if (!DISTRIBUTABLE_TYPES.includes(txn.transactionType)) {
    const err = new Error('Only POSTED DIVIDEND, INTEREST, or SELL transactions can be distributed');
    err.statusCode = 400;
    throw err;
  }
  if (txn.postingStatus !== 'POSTED') {
    const err = new Error('Source transaction must be posted before partner distribution');
    err.statusCode = 400;
    throw err;
  }

  const existing = await InvestmentDistribution.findOne({
    where: {
      sourceTransactionId: txn.id,
      postingStatus: { [Op.ne]: 'CANCELLED' },
      ...companyWhere(req),
    },
  });
  if (existing) {
    const err = new Error('A distribution already exists for this transaction');
    err.statusCode = 400;
    throw err;
  }

  const allocations = await InvestmentPartnerAllocation.findAll({
    where: { investmentAssetId: txn.investmentAssetId, isActive: true, ...companyWhere(req) },
  });
  if (!allocations.length) {
    const err = new Error('No partner allocations found for this asset');
    err.statusCode = 400;
    throw err;
  }

  const lineData = allocations
    .map((alloc) => {
      const sharePct = txn.transactionType === 'SELL'
        ? Number(alloc.profitSharePercentage ?? alloc.ownershipPercentage ?? 0)
        : Number(alloc.dividendSharePercentage ?? alloc.ownershipPercentage ?? 0);
      const shareAmount = allocationService.shareAmountForTransaction(alloc, txn);
      return {
        allocation: alloc,
        sharePct,
        shareAmount,
      };
    })
    .filter((row) => row.shareAmount > 0);

  if (!lineData.length) {
    const err = new Error('No distributable partner shares calculated');
    err.statusCode = 400;
    throw err;
  }

  const totalAmount = round2(lineData.reduce((sum, row) => sum + row.shareAmount, 0));
  const distributionType = mapDistributionType(txn.transactionType);

  const t = await sequelize.transaction();
  try {
    const distributionNo = await allocateInvestmentNumber(req.companyId, 'distribution', t);
    const dist = await InvestmentDistribution.create(
      withCompanyId(req, {
        distributionNo,
        distributionDate: txn.transactionDate,
        distributionType,
        investmentAssetId: txn.investmentAssetId,
        sourceTransactionId: txn.id,
        totalAmount,
        bankAccountId: txn.bankAccountId,
        postingStatus: 'DRAFT',
        approvalStatus: 'PENDING',
        remarks: `Partner distribution for ${txn.transactionNo}`,
      }),
      { transaction: t }
    );

    for (const row of lineData) {
      await InvestmentDistributionLine.create(
        withCompanyId(req, {
          distributionId: dist.id,
          allocationId: row.allocation.id,
          investorName: row.allocation.investorName,
          investorRefId: row.allocation.investorRefId,
          sharePercentage: row.sharePct,
          shareAmount: row.shareAmount,
        }),
        { transaction: t }
      );
    }

    await t.commit();
    return getDistribution(req, dist.id);
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function approveDistribution(req, distributionId, userId) {
  const dist = await getDistribution(req, distributionId);
  if (dist.approvalStatus === 'APPROVED') {
    const err = new Error('Distribution already approved');
    err.statusCode = 400;
    throw err;
  }
  if (dist.postingStatus === 'POSTED') {
    const err = new Error('Cannot approve a posted distribution');
    err.statusCode = 400;
    throw err;
  }
  await dist.update({
    approvalStatus: 'APPROVED',
    postingStatus: 'APPROVED',
    approvedBy: userId,
  });
  return getDistribution(req, distributionId);
}

async function postDistribution(req, distributionId) {
  return postingService.postDistribution(req, distributionId);
}

async function cancelDistribution(req, distributionId) {
  const dist = await getDistribution(req, distributionId);
  if (dist.postingStatus === 'POSTED') {
    const err = new Error('Cannot cancel a posted distribution');
    err.statusCode = 400;
    throw err;
  }
  await dist.update({ postingStatus: 'CANCELLED', approvalStatus: 'REJECTED' });
  return getDistribution(req, distributionId);
}

module.exports = {
  listDistributions,
  getDistribution,
  prepareFromTransaction,
  approveDistribution,
  postDistribution,
  cancelDistribution,
};
