const { Op } = require('sequelize');
const {
  InvestmentAsset,
  InvestmentHolding,
  InvestmentTransaction,
  AccountsTrans,
  ChartOfAccount,
} = require('../../models');
const { sequelize } = require('../../config/database');
const { companyWhere, withCompanyId, assertBankInCompany } = require('../../utils/companyScope');
const { allocateInvestmentNumber } = require('./investmentDocumentNumber.service');
const portfolioService = require('./investmentPortfolio.service');
const { round2, round4, round6 } = require('./investmentFinancePostingUtils');

const CLOSED_STATUSES = ['SOLD', 'CLOSED'];

function calcBaseAmount(netAmount, exchangeRate, currencyCode) {
  const rate = currencyCode === 'AED' ? 1 : Number(exchangeRate || 1);
  return round2(Number(netAmount || 0) * rate);
}

async function getOrCreateHolding(req, assetId, transaction) {
  let holding = await InvestmentHolding.findOne({
    where: { investmentAssetId: assetId, ...companyWhere(req) },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!holding) {
    holding = await InvestmentHolding.create(
      withCompanyId(req, { investmentAssetId: assetId }),
      { transaction }
    );
  }
  return holding;
}

function applyBuyToHolding(holding, quantity, unitPrice, chargesAmount = 0) {
  const qty = round6(Number(quantity));
  const price = round4(Number(unitPrice));
  const buyCost = round2(qty * price + Number(chargesAmount || 0));
  const prevQty = round6(holding.quantity);
  const prevCost = round2(holding.totalCost);
  const newQty = round6(prevQty + qty);
  const newTotalCost = round2(prevCost + buyCost);
  const avgCost = newQty > 0 ? round4(newTotalCost / newQty) : 0;
  holding.quantity = newQty;
  holding.totalCost = newTotalCost;
  holding.averageCost = avgCost;
  if (price > 0) holding.currentPrice = price;
  holding.currentMarketValue = round2(newQty * Number(holding.currentPrice || avgCost));
  holding.baseCurrencyValue = holding.currentMarketValue;
  holding.unrealizedGainLoss = round2(holding.currentMarketValue - holding.totalCost);
}

function applySellToHolding(holding, quantity, unitPrice) {
  const qty = round6(Number(quantity));
  const sellQty = round6(holding.quantity);
  if (qty > sellQty + 0.000001) {
    const err = new Error(`Cannot sell more than available quantity (${sellQty})`);
    err.statusCode = 400;
    throw err;
  }
  const avgCost = round4(holding.averageCost);
  const costBasis = round2(qty * avgCost);
  const proceeds = round2(qty * Number(unitPrice));
  const realized = round2(proceeds - costBasis);
  holding.realizedGainLoss = round2(Number(holding.realizedGainLoss || 0) + realized);
  const newQty = round6(sellQty - qty);
  holding.quantity = newQty;
  if (newQty <= 0) {
    holding.totalCost = 0;
    holding.averageCost = 0;
    holding.currentMarketValue = 0;
    holding.unrealizedGainLoss = 0;
  } else {
    holding.totalCost = round2(newQty * avgCost);
    holding.currentMarketValue = round2(newQty * Number(holding.currentPrice || avgCost));
    holding.unrealizedGainLoss = round2(holding.currentMarketValue - holding.totalCost);
  }
  return realized;
}

function applyBonusToHolding(holding, quantity) {
  const qty = round6(Number(quantity));
  if (qty <= 0) {
    const err = new Error('Bonus quantity must be greater than zero');
    err.statusCode = 400;
    throw err;
  }
  const prevQty = round6(holding.quantity);
  const prevCost = round2(holding.totalCost);
  const newQty = round6(prevQty + qty);
  holding.quantity = newQty;
  holding.averageCost = newQty > 0 ? round4(prevCost / newQty) : 0;
  holding.currentMarketValue = round2(newQty * Number(holding.currentPrice || holding.averageCost));
  holding.baseCurrencyValue = holding.currentMarketValue;
  holding.unrealizedGainLoss = round2(holding.currentMarketValue - holding.totalCost);
}

function applySplitToHolding(holding, splitRatio) {
  const ratio = Number(splitRatio);
  if (!ratio || ratio <= 0) {
    const err = new Error('Split ratio must be greater than zero');
    err.statusCode = 400;
    throw err;
  }
  holding.quantity = round6(Number(holding.quantity) * ratio);
  holding.averageCost = round4(Number(holding.averageCost) / ratio);
  if (holding.currentPrice) holding.currentPrice = round4(Number(holding.currentPrice) / ratio);
  holding.currentMarketValue = round2(Number(holding.quantity) * Number(holding.currentPrice || holding.averageCost));
  holding.baseCurrencyValue = holding.currentMarketValue;
  holding.unrealizedGainLoss = round2(holding.currentMarketValue - holding.totalCost);
}

function applyWriteOffToHolding(holding, quantity) {
  const qty = round6(Number(quantity));
  const sellQty = round6(holding.quantity);
  if (qty > sellQty + 0.000001) {
    const err = new Error(`Cannot write off more than available quantity (${sellQty})`);
    err.statusCode = 400;
    throw err;
  }
  const avgCost = round4(holding.averageCost);
  const costBasis = round2(qty * avgCost);
  holding.realizedGainLoss = round2(Number(holding.realizedGainLoss || 0) - costBasis);
  const newQty = round6(sellQty - qty);
  holding.quantity = newQty;
  if (newQty <= 0) {
    holding.totalCost = 0;
    holding.averageCost = 0;
    holding.currentMarketValue = 0;
    holding.unrealizedGainLoss = 0;
  } else {
    holding.totalCost = round2(newQty * avgCost);
    holding.currentMarketValue = round2(newQty * Number(holding.currentPrice || avgCost));
    holding.unrealizedGainLoss = round2(holding.currentMarketValue - holding.totalCost);
  }
  return costBasis;
}

function validateTransactionPayload(asset, payload) {
  const { transactionType, transactionDate, currencyCode, exchangeRate } = payload;
  if (!transactionType || !transactionDate) {
    const err = new Error('transactionType and transactionDate are required');
    err.statusCode = 400;
    throw err;
  }
  if (currencyCode && currencyCode !== 'AED' && !exchangeRate) {
    const err = new Error('exchange_rate is required for non-AED currency');
    err.statusCode = 400;
    throw err;
  }
  if (asset.acquisitionDate && transactionDate < asset.acquisitionDate) {
    const err = new Error('Transaction date cannot be before acquisition date');
    err.statusCode = 400;
    throw err;
  }
  if (['DIVIDEND', 'INTEREST'].includes(transactionType) && CLOSED_STATUSES.includes(asset.status)) {
    const err = new Error('Cannot record income for closed/sold asset');
    err.statusCode = 400;
    throw err;
  }
}

async function createTransaction(req, payload) {
  const asset = await portfolioService.getAssetDetail(req, payload.investmentAssetId);
  validateTransactionPayload(asset, payload);

  if (payload.bankAccountId) {
    await assertBankInCompany(payload.bankAccountId, req);
  }

  const { assertNoDuplicate } = require('./migration/duplicateFingerprint.service');
  await assertNoDuplicate(require('../../models'), {
    companyId: req.companyId,
    instrumentOrAssetKey: `A:${asset.id}`,
    transactionType: payload.transactionType,
    tradeDate: payload.transactionDate,
    quantity: payload.quantity || 0,
    amount: payload.netAmount ?? payload.grossAmount ?? 0,
    brokerReference: payload.brokerReference,
    externalReference: payload.externalReference,
    transactionOrigin: payload.transactionOrigin || 'LEGACY',
  });

  const t = await sequelize.transaction();
  try {
    const transactionNo = await allocateInvestmentNumber(req.companyId, 'transaction', t);
    const grossAmount = round2(payload.grossAmount ?? (Number(payload.quantity || 0) * Number(payload.unitPrice || 0)));
    const chargesAmount = round2(payload.chargesAmount || 0);
    const taxAmount = round2(payload.taxAmount || 0);
    const netAmount = round2(payload.netAmount ?? grossAmount - chargesAmount - taxAmount);
    const currencyCode = payload.currencyCode || asset.currencyCode || 'AED';
    const exchangeRate = currencyCode === 'AED' ? 1 : Number(payload.exchangeRate || 1);
    const baseAmount = calcBaseAmount(netAmount, exchangeRate, currencyCode);

    const txn = await InvestmentTransaction.create(
      withCompanyId(req, {
        investmentAssetId: asset.id,
        transactionNo,
        transactionType: payload.transactionType,
        transactionDate: payload.transactionDate,
        quantity: payload.quantity || 0,
        unitPrice: payload.unitPrice || 0,
        grossAmount,
        chargesAmount,
        taxAmount,
        netAmount,
        currencyCode,
        exchangeRate,
        baseAmount,
        bankAccountId: payload.bankAccountId || null,
        remarks: payload.remarks || null,
        transactionOrigin: payload.transactionOrigin || 'LEGACY',
        externalReference: payload.externalReference || null,
        brokerReference: payload.brokerReference || null,
        legacyEntryReason: payload.legacyEntryReason || req.legacyEntryReason || req.legacyEmergency?.reason || null,
        postingStatus: 'DRAFT',
        approvalStatus: 'PENDING',
      }),
      { transaction: t }
    );

    const holding = await getOrCreateHolding(req, asset.id, t);
    if (payload.transactionType === 'BUY') {
      applyBuyToHolding(holding, payload.quantity, payload.unitPrice, chargesAmount);
      if (asset.status === 'DRAFT') await asset.update({ status: 'ACTIVE' }, { transaction: t });
    } else if (payload.transactionType === 'SELL') {
      applySellToHolding(holding, payload.quantity, payload.unitPrice);
      if (round6(holding.quantity) <= 0) await asset.update({ status: 'SOLD' }, { transaction: t });
    } else if (payload.transactionType === 'BONUS') {
      applyBonusToHolding(holding, payload.quantity);
    } else if (payload.transactionType === 'SPLIT') {
      applySplitToHolding(holding, payload.unitPrice || payload.splitRatio);
    } else if (payload.transactionType === 'MATURITY') {
      const matureQty = round6(payload.quantity || holding.quantity);
      if (matureQty <= 0) {
        const err = new Error('No quantity available to mature');
        err.statusCode = 400;
        throw err;
      }
      applySellToHolding(holding, matureQty, payload.unitPrice);
      await asset.update({ status: 'MATURED' }, { transaction: t });
    } else if (payload.transactionType === 'WRITE_OFF') {
      applyWriteOffToHolding(holding, payload.quantity);
      if (round6(holding.quantity) <= 0) await asset.update({ status: 'CLOSED' }, { transaction: t });
    }

    await holding.save({ transaction: t });
    await t.commit();
    return txn;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function listAssetTransactions(req, assetId, { page = 1, limit = 50 } = {}) {
  await portfolioService.getAssetDetail(req, assetId);
  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await InvestmentTransaction.findAndCountAll({
    where: { investmentAssetId: assetId, ...companyWhere(req) },
    order: [['transactionDate', 'DESC'], ['id', 'DESC']],
    limit: Number(limit),
    offset,
  });
  return { transactions: rows, pagination: { total: count, page: Number(page), limit: Number(limit) } };
}

async function listTransactions(req, filters = {}) {
  const { page, limit, offset } = require('./shared/investmentQueryScope').parsePagination(filters, 20, 100);
  const { testDataWhere, paginationMeta, parseSort } = require('./shared/investmentQueryScope');
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (filters.transactionType) where.transactionType = filters.transactionType;
  if (filters.postingStatus) where.postingStatus = filters.postingStatus;
  if (filters.approvalStatus) where.approvalStatus = filters.approvalStatus;
  if (filters.fromDate || filters.toDate) {
    where.transactionDate = {};
    if (filters.fromDate) where.transactionDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.transactionDate[Op.lte] = filters.toDate;
  }
  const order = parseSort(
    filters,
    ['transactionDate', 'transactionNo', 'transactionType', 'netAmount', 'createdAt'],
    [['transactionDate', 'DESC'], ['id', 'DESC']]
  );
  const { count, rows } = await InvestmentTransaction.findAndCountAll({
    where,
    include: [{ model: InvestmentAsset, as: 'asset', attributes: ['id', 'investmentCode', 'investmentName'] }],
    order,
    limit,
    offset,
  });
  return {
    transactions: rows,
    total: count,
    pagination: paginationMeta(count, page, limit),
  };
}

async function duplicateTransaction(req, txnId) {
  const source = await getTransaction(req, txnId);
  const plain = source.toJSON();
  return createTransaction(req, {
    investmentAssetId: plain.investmentAssetId,
    transactionType: plain.transactionType,
    transactionDate: plain.transactionDate,
    quantity: plain.quantity,
    unitPrice: plain.unitPrice,
    grossAmount: plain.grossAmount,
    chargesAmount: plain.chargesAmount,
    taxAmount: plain.taxAmount,
    currencyCode: plain.currencyCode,
    exchangeRate: plain.exchangeRate,
    bankAccountId: plain.bankAccountId,
    remarks: plain.remarks ? `Copy of ${plain.transactionNo}: ${plain.remarks}` : `Copy of ${plain.transactionNo}`,
    isTestData: plain.isTestData,
  });
}

async function bulkApproveTransactions(req, ids = []) {
  const results = { ok: [], failed: [] };
  for (const id of ids) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const txn = await approveTransaction(req, id);
      results.ok.push(txn.id);
    } catch (e) {
      results.failed.push({ id, message: e.message });
    }
  }
  return results;
}

async function bulkRejectTransactions(req, ids = [], reason) {
  const results = { ok: [], failed: [] };
  for (const id of ids) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const txn = await rejectTransaction(req, id);
      if (reason) await txn.update({ remarks: `${txn.remarks || ''}\nReject: ${reason}`.trim() });
      results.ok.push(txn.id);
    } catch (e) {
      results.failed.push({ id, message: e.message });
    }
  }
  return results;
}

async function bulkPostTransactions(req, ids = []) {
  const postingService = require('./investmentPosting.service');
  const results = { ok: [], failed: [] };
  for (const id of ids) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const txn = await postingService.postTransaction(req, id);
      results.ok.push(txn.id || id);
    } catch (e) {
      results.failed.push({ id, message: e.message });
    }
  }
  return results;
}

async function getTransaction(req, txnId) {
  const txn = await InvestmentTransaction.findOne({
    where: { id: txnId, ...companyWhere(req) },
    include: [
      {
        model: InvestmentAsset,
        as: 'asset',
        include: [{ model: InvestmentHolding, as: 'holding' }],
      },
    ],
  });
  if (!txn) {
    const err = new Error('Transaction not found');
    err.statusCode = 404;
    throw err;
  }
  return txn;
}

async function approveTransaction(req, txnId) {
  const txn = await getTransaction(req, txnId);
  if (txn.approvalStatus === 'APPROVED') {
    const err = new Error('Transaction already approved');
    err.statusCode = 400;
    throw err;
  }
  if (txn.postingStatus === 'POSTED' || txn.postingStatus === 'CANCELLED') {
    const err = new Error('Cannot approve this transaction');
    err.statusCode = 400;
    throw err;
  }
  await txn.update({ approvalStatus: 'APPROVED', postingStatus: 'APPROVED' });
  return txn;
}

async function getTransactionLedger(req, txnId) {
  const txn = await getTransaction(req, txnId);
  if (txn.postingStatus !== 'POSTED') {
    return { transaction: txn, lines: [] };
  }
  const where = { companyId: req.companyId };
  if (txn.journalVoucherId) {
    where.jvId = txn.journalVoucherId;
  } else {
    where.jvNumber = txn.transactionNo;
  }
  const lines = await AccountsTrans.findAll({
    where,
    include: [{ model: ChartOfAccount, as: 'ledger', attributes: ['id', 'accountCode', 'accountName'] }],
    order: [['id', 'ASC']],
  });
  return { transaction: txn, lines };
}

async function rejectTransaction(req, txnId) {
  const txn = await getTransaction(req, txnId);
  if (txn.approvalStatus !== 'PENDING') {
    const err = new Error('Only pending transactions can be rejected');
    err.statusCode = 400;
    throw err;
  }
  if (txn.postingStatus === 'POSTED') {
    const err = new Error('Posted transactions cannot be rejected');
    err.statusCode = 400;
    throw err;
  }
  await txn.update({ approvalStatus: 'REJECTED', postingStatus: 'CANCELLED' });
  return txn;
}

async function cancelTransaction(req, txnId) {
  const txn = await getTransaction(req, txnId);
  if (txn.postingStatus === 'POSTED') {
    const err = new Error('Posted transactions cannot be cancelled');
    err.statusCode = 400;
    throw err;
  }
  await txn.update({ postingStatus: 'CANCELLED', approvalStatus: 'REJECTED' });
  return txn;
}

module.exports = {
  createTransaction,
  listAssetTransactions,
  listTransactions,
  getTransaction,
  getTransactionLedger,
  approveTransaction,
  rejectTransaction,
  cancelTransaction,
  duplicateTransaction,
  bulkApproveTransactions,
  bulkRejectTransactions,
  bulkPostTransactions,
  applyBuyToHolding,
  applySellToHolding,
  applyBonusToHolding,
  applySplitToHolding,
  applyWriteOffToHolding,
  calcBaseAmount,
  validateTransactionPayload,
};
