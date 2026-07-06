const { Op } = require('sequelize');
const {
  InvestmentAsset,
  InvestmentHolding,
  InvestmentTransaction,
  InvestmentPartnerAllocation,
  InvestmentValuationHistory,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const allocationService = require('./investmentPartnerAllocation.service');

function buildAssetFilter(req, filters = {}) {
  const where = { ...companyWhere(req) };
  if (filters.assetType) where.assetType = filters.assetType;
  if (filters.status) where.status = filters.status;
  if (filters.accountingClassification) where.accountingClassification = filters.accountingClassification;
  if (filters.currency) where.currencyCode = filters.currency;
  return where;
}

async function portfolioReport(req, filters = {}) {
  const assets = await InvestmentAsset.findAll({
    where: buildAssetFilter(req, filters),
    include: [
      { model: InvestmentHolding, as: 'holding' },
      { model: InvestmentPartnerAllocation, as: 'allocations', where: { isActive: true }, required: false },
    ],
    order: [['investmentName', 'ASC']],
  });
  return assets;
}

async function ledgerReport(req, filters = {}) {
  const where = { ...companyWhere(req) };
  if (filters.fromDate || filters.toDate) {
    where.transactionDate = {};
    if (filters.fromDate) where.transactionDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.transactionDate[Op.lte] = filters.toDate;
  }
  if (filters.transactionType) where.transactionType = filters.transactionType;
  if (filters.investmentAssetId) where.investmentAssetId = filters.investmentAssetId;

  if (filters.investorName) {
    const allocs = await InvestmentPartnerAllocation.findAll({
      where: {
        ...companyWhere(req),
        isActive: true,
        investorName: { [Op.like]: `%${String(filters.investorName).trim()}%` },
      },
      attributes: ['investmentAssetId'],
    });
    const assetIds = [...new Set(allocs.map((a) => a.investmentAssetId))];
    if (!assetIds.length) return [];
    where.investmentAssetId = { [Op.in]: assetIds };
  }

  return InvestmentTransaction.findAll({
    where,
    include: [{ model: InvestmentAsset, as: 'asset', attributes: ['investmentCode', 'investmentName'] }],
    order: [['transactionDate', 'ASC'], ['id', 'ASC']],
  });
}

async function dividendReport(req, filters = {}) {
  const where = { ...companyWhere(req), transactionType: { [Op.in]: ['DIVIDEND', 'INTEREST'] } };
  if (filters.fromDate || filters.toDate) {
    where.transactionDate = {};
    if (filters.fromDate) where.transactionDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.transactionDate[Op.lte] = filters.toDate;
  }
  return InvestmentTransaction.findAll({
    where,
    include: [{ model: InvestmentAsset, as: 'asset', attributes: ['investmentCode', 'investmentName'] }],
    order: [['transactionDate', 'ASC']],
  });
}

async function gainLossReport(req, filters = {}) {
  const holdings = await InvestmentHolding.findAll({
    where: companyWhere(req),
    include: [{
      model: InvestmentAsset,
      as: 'asset',
      where: buildAssetFilter(req, filters),
    }],
  });
  return holdings.map((h) => ({
    asset: h.asset,
    totalCost: h.totalCost,
    currentMarketValue: h.currentMarketValue,
    unrealizedGainLoss: h.unrealizedGainLoss,
    realizedGainLoss: h.realizedGainLoss,
  }));
}

async function partnerStatement(req, partnerId, filters = {}) {
  const allocWhere = { ...companyWhere(req), isActive: true };
  if (filters.investorName) {
    allocWhere.investorName = { [Op.like]: `%${String(filters.investorName).trim()}%` };
  } else if (partnerId && String(partnerId) !== '0') {
    allocWhere.investorRefId = partnerId;
  }

  const allocations = await InvestmentPartnerAllocation.findAll({
    where: allocWhere,
    include: [{
      model: InvestmentAsset,
      as: 'asset',
      include: [{ model: InvestmentHolding, as: 'holding' }],
    }],
  });

  const txns = await InvestmentTransaction.findAll({
    where: {
      ...companyWhere(req),
      transactionType: { [Op.in]: ['DIVIDEND', 'INTEREST', 'SELL'] },
      ...(filters.fromDate || filters.toDate ? {
        transactionDate: {
          ...(filters.fromDate ? { [Op.gte]: filters.fromDate } : {}),
          ...(filters.toDate ? { [Op.lte]: filters.toDate } : {}),
        },
      } : {}),
    },
    include: [{ model: InvestmentAsset, as: 'asset' }],
  });

  const lines = [];
  for (const alloc of allocations) {
    const assetTxns = txns.filter((t) => t.investmentAssetId === alloc.investmentAssetId);
    for (const txn of assetTxns) {
      lines.push({
        investorName: alloc.investorName,
        asset: txn.asset,
        transaction: txn,
        shareAmount: allocationService.distributeByAllocation([alloc], txn.baseAmount)[0]?.shareAmount || 0,
      });
    }
    lines.push({
      investorName: alloc.investorName,
      asset: alloc.asset,
      holdingShare: {
        ownershipPercentage: alloc.ownershipPercentage,
        marketValueShare: Number(alloc.asset?.holding?.currentMarketValue || 0) * (Number(alloc.ownershipPercentage) / 100),
      },
    });
  }

  return { allocations, transactions: lines };
}

async function valuationHistoryReport(req, filters = {}) {
  const where = { ...companyWhere(req) };
  if (filters.investmentAssetId) where.investmentAssetId = filters.investmentAssetId;
  if (filters.fromDate || filters.toDate) {
    where.valuationDate = {};
    if (filters.fromDate) where.valuationDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.valuationDate[Op.lte] = filters.toDate;
  }
  return InvestmentValuationHistory.findAll({
    where,
    include: [{ model: InvestmentAsset, as: 'asset', attributes: ['investmentCode', 'investmentName'] }],
    order: [['valuationDate', 'DESC']],
  });
}

module.exports = {
  portfolioReport,
  ledgerReport,
  dividendReport,
  gainLossReport,
  partnerStatement,
  valuationHistoryReport,
};
