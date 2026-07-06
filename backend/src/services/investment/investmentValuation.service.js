const {
  InvestmentAsset,
  InvestmentHolding,
  InvestmentValuationHistory,
  InvestmentTransaction,
} = require('../../models');
const { sequelize } = require('../../config/database');
const { companyWhere, withCompanyId } = require('../../utils/companyScope');
const { allocateInvestmentNumber } = require('./investmentDocumentNumber.service');
const portfolioService = require('./investmentPortfolio.service');
const postingService = require('./investmentPosting.service');
const { round2, round4 } = require('./investmentFinancePostingUtils');

async function listValuations(req, assetId) {
  await portfolioService.getAssetDetail(req, assetId);
  return InvestmentValuationHistory.findAll({
    where: { investmentAssetId: assetId, ...companyWhere(req) },
    order: [['valuationDate', 'DESC']],
  });
}

async function createValuationDirect(req, payload) {
  const asset = await portfolioService.getAssetDetail(req, payload.investmentAssetId);
  if (asset.acquisitionDate && payload.valuationDate < asset.acquisitionDate) {
    const err = new Error('Valuation date cannot be before acquisition date');
    err.statusCode = 400;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    const valuationNo = await allocateInvestmentNumber(req.companyId, 'valuation', t);
    const holding = asset.holding || await InvestmentHolding.findOne({
      where: { investmentAssetId: asset.id, ...companyWhere(req) },
      transaction: t,
    });
    const quantity = Number(payload.quantity ?? holding?.quantity ?? 0);
    const price = round4(payload.price);
    const exchangeRate = Number(payload.exchangeRate || 1);
    const marketValue = round2(quantity * price);
    const baseMarketValue = round2(marketValue * exchangeRate);
    const totalCost = round2(holding?.totalCost || 0);
    const unrealizedGainLoss = round2(baseMarketValue - totalCost);

    const valuation = await InvestmentValuationHistory.create(
      withCompanyId(req, {
        investmentAssetId: asset.id,
        valuationNo,
        valuationDate: payload.valuationDate,
        quantity,
        price,
        marketValue,
        exchangeRate,
        baseMarketValue,
        unrealizedGainLoss,
        valuationSource: payload.valuationSource || 'MANUAL',
        approvalStatus: 'PENDING',
      }),
      { transaction: t }
    );

    await t.commit();
    return valuation;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function approveValuation(req, valuationId, userId) {
  const valuation = await InvestmentValuationHistory.findOne({
    where: { id: valuationId, ...companyWhere(req) },
    include: [{ model: InvestmentAsset, as: 'asset' }],
  });
  if (!valuation) {
    const err = new Error('Valuation not found');
    err.statusCode = 404;
    throw err;
  }
  if (valuation.approvalStatus === 'APPROVED') {
    const err = new Error('Valuation already approved');
    err.statusCode = 400;
    throw err;
  }

  const t = await sequelize.transaction();
  try {
    await valuation.update({ approvalStatus: 'APPROVED', approvedBy: userId }, { transaction: t });

    const holding = await InvestmentHolding.findOne({
      where: { investmentAssetId: valuation.investmentAssetId, ...companyWhere(req) },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    let revaluationTransaction = null;
    if (holding) {
      const priorUnrealized = round2(holding.unrealizedGainLoss || 0);
      holding.currentPrice = valuation.price;
      holding.currentMarketValue = valuation.marketValue;
      holding.baseCurrencyValue = valuation.baseMarketValue;
      holding.unrealizedGainLoss = valuation.unrealizedGainLoss;
      holding.lastValuationDate = valuation.valuationDate;
      await holding.save({ transaction: t });

      const delta = round2(valuation.unrealizedGainLoss - priorUnrealized);
      if (Math.abs(delta) >= 0.01) {
        const transactionNo = await allocateInvestmentNumber(req.companyId, 'transaction', t);
        revaluationTransaction = await InvestmentTransaction.create(
          withCompanyId(req, {
            investmentAssetId: valuation.investmentAssetId,
            transactionNo,
            transactionType: 'REVALUATION',
            transactionDate: valuation.valuationDate,
            quantity: 0,
            unitPrice: 0,
            grossAmount: Math.abs(delta),
            netAmount: delta,
            baseAmount: Math.abs(delta),
            currencyCode: valuation.asset?.currencyCode || 'AED',
            exchangeRate: valuation.exchangeRate || 1,
            remarks: `Revaluation from ${valuation.valuationNo}`,
            postingStatus: 'APPROVED',
            approvalStatus: 'APPROVED',
          }),
          { transaction: t }
        );
      }
    }

    await t.commit();

    let postingError = null;
    if (revaluationTransaction) {
      try {
        revaluationTransaction = await postingService.postTransaction(req, revaluationTransaction.id);
      } catch (err) {
        postingError = err.message || 'Revaluation GL posting failed';
        revaluationTransaction = await InvestmentTransaction.findByPk(revaluationTransaction.id);
      }
    }

    return { valuation, revaluationTransaction, postingError };
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function importValuationsDirect(req, payload = {}) {
  const rows = Array.isArray(payload.rows) ? payload.rows : [];
  if (!rows.length) {
    const err = new Error('At least one valuation row is required');
    err.statusCode = 400;
    throw err;
  }

  const autoApprove = Boolean(payload.autoApprove);
  const results = { created: [], errors: [], approved: [] };

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    try {
      let assetId = row.investmentAssetId;
      if (!assetId && row.investmentCode) {
        const asset = await InvestmentAsset.findOne({
          where: { investmentCode: String(row.investmentCode).trim(), ...companyWhere(req) },
        });
        if (!asset) throw new Error(`Asset not found: ${row.investmentCode}`);
        assetId = asset.id;
      }
      if (!assetId) throw new Error('investmentAssetId or investmentCode is required');
      if (!row.valuationDate) throw new Error('valuationDate is required');
      if (row.price == null || Number.isNaN(Number(row.price))) throw new Error('price is required');

      const valuation = await createValuationDirect(req, {
        investmentAssetId: assetId,
        valuationDate: row.valuationDate,
        price: row.price,
        quantity: row.quantity,
        exchangeRate: row.exchangeRate || 1,
        valuationSource: 'IMPORT',
      });
      results.created.push(valuation);

      if (autoApprove) {
        const approved = await approveValuation(req, valuation.id, req.user?.id);
        results.approved.push(approved.valuation || approved);
      }
    } catch (err) {
      results.errors.push({
        row: i + 1,
        investmentCode: row.investmentCode,
        investmentAssetId: row.investmentAssetId,
        message: err.message || 'Import failed',
      });
    }
  }

  return results;
}

async function createValuation(req, payload) {
  return createValuationDirect(req, payload);
}

async function importValuations(req, payload) {
  return importValuationsDirect(req, payload);
}

module.exports = {
  listValuations,
  createValuation,
  createValuationDirect,
  approveValuation,
  importValuations,
  importValuationsDirect,
};
