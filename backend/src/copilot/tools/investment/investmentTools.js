'use strict';

/**
 * Phase 24 Investment Copilot tools — grounded ERP data via intelligence service.
 * Adapters map Copilot executor `{ companyId, userId, ...input }` → req-shaped calls.
 */
const { Op } = require('sequelize');
const { InvestmentAsset, InvestmentHolding } = require('../../../models');
const intelligence = require('../../../services/investment/intelligence/investmentIntelligence.service');

const MAX_ROWS = 25;

function makeReq(companyId, userId, extra = {}) {
  const permissions = extra.permissions || [
    'module:investment:view',
    'module:investment:reports',
  ];
  return {
    companyId,
    userId,
    user: { id: userId, permissions },
    permissions,
    query: extra.query || {},
    body: extra.body || {},
  };
}

async function invoke(tool, { companyId, userId, ...input }) {
  const req = makeReq(companyId, userId, {
    permissions: input.permissions,
  });
  req.bypassPermission = true;
  const grounded = await intelligence.invokeCopilotTool(req, { tool, args: input });
  return grounded.data;
}

// ——— Legacy Phase 15 tools (kept for compatibility) ———

async function getInvestmentPortfolioSummary({ companyId }) {
  const holdings = await InvestmentHolding.findAll({
    where: { companyId },
    include: [
      {
        model: InvestmentAsset,
        as: 'asset',
        attributes: ['id', 'investmentCode', 'investmentName', 'assetType', 'currencyCode', 'status'],
      },
    ],
    limit: 200,
  });

  let totalCost = 0;
  let marketValue = 0;
  let unrealized = 0;
  const byType = {};

  for (const h of holdings) {
    totalCost += Number(h.totalCost || 0);
    marketValue += Number(h.currentMarketValue || 0);
    unrealized += Number(h.unrealizedGainLoss || 0);
    const type = h.asset?.assetType || 'Other';
    byType[type] = (byType[type] || 0) + Number(h.currentMarketValue || 0);
  }

  const activeAssets = await InvestmentAsset.count({
    where: { companyId, status: 'ACTIVE' },
  });

  // Prefer v2 summary when available
  try {
    const v2 = await invoke('getPortfolioSummary', { companyId, userId: null });
    return {
      ...v2,
      legacy: {
        activeAssets,
        holdingCount: holdings.length,
        totalInvestedCost: Number(totalCost.toFixed(2)),
        currentMarketValue: Number(marketValue.toFixed(2)),
        unrealizedGainLoss: Number(unrealized.toFixed(2)),
        byAssetType: Object.fromEntries(
          Object.entries(byType).map(([k, v]) => [k, Number(v.toFixed(2))])
        ),
      },
    };
  } catch {
    return {
      activeAssets,
      holdingCount: holdings.length,
      totalInvestedCost: Number(totalCost.toFixed(2)),
      currentMarketValue: Number(marketValue.toFixed(2)),
      unrealizedGainLoss: Number(unrealized.toFixed(2)),
      byAssetType: Object.fromEntries(
        Object.entries(byType).map(([k, v]) => [k, Number(v.toFixed(2))])
      ),
    };
  }
}

async function getInvestmentHoldingDetails({ companyId, assetId, search }) {
  const assetWhere = { companyId };
  if (assetId) assetWhere.id = assetId;
  if (search) {
    assetWhere[Op.or] = [
      { investmentName: { [Op.like]: `%${search}%` } },
      { investmentCode: { [Op.like]: `%${search}%` } },
    ];
  }

  const assets = await InvestmentAsset.findAll({
    where: assetWhere,
    attributes: [
      'id',
      'investmentCode',
      'investmentName',
      'assetType',
      'currencyCode',
      'status',
      'acquisitionDate',
      'maturityDate',
    ],
    limit: assetId ? 1 : MAX_ROWS,
  });

  const result = [];
  for (const a of assets) {
    const holding = await InvestmentHolding.findOne({
      where: { companyId, investmentAssetId: a.id },
      attributes: [
        'quantity',
        'totalCost',
        'currentMarketValue',
        'unrealizedGainLoss',
        'realizedGainLoss',
        'lastValuationDate',
      ],
    });
    result.push({
      ...a.toJSON(),
      holding: holding
        ? {
            quantity: Number(holding.quantity || 0),
            totalCost: Number(holding.totalCost || 0),
            currentMarketValue: Number(holding.currentMarketValue || 0),
            unrealizedGainLoss: Number(holding.unrealizedGainLoss || 0),
            realizedGainLoss: Number(holding.realizedGainLoss || 0),
            lastValuationDate: holding.lastValuationDate,
          }
        : null,
    });
  }
  return result;
}

async function getUpcomingInvestmentMaturities({ companyId, days = 90 }) {
  try {
    return await invoke('getUpcomingMaturities', { companyId, userId: null, days });
  } catch {
    const windowDays = Math.min(Math.max(Number(days) || 90, 1), 365);
    const until = new Date();
    until.setDate(until.getDate() + windowDays);
    const rows = await InvestmentAsset.findAll({
      where: {
        companyId,
        status: 'ACTIVE',
        maturityDate: {
          [Op.ne]: null,
          [Op.lte]: until.toISOString().slice(0, 10),
        },
      },
      attributes: [
        'id',
        'investmentCode',
        'investmentName',
        'assetType',
        'currencyCode',
        'maturityDate',
      ],
      order: [['maturityDate', 'ASC']],
      limit: MAX_ROWS,
    });
    return { days: windowDays, count: rows.length, assets: rows.map((r) => r.toJSON()) };
  }
}

// ——— Phase 24 grounded tools ———

const getPortfolioSummary = (ctx) => invoke('getPortfolioSummary', ctx);
const getPortfolioPerformance = (ctx) => invoke('getPortfolioPerformance', ctx);
const getHoldingDetails = (ctx) => invoke('getHoldingDetails', ctx);
const getInstrumentDetails = (ctx) => invoke('getInstrumentDetails', ctx);
const getPendingSettlements = (ctx) => invoke('getPendingSettlements', ctx);
const getFailedSettlements = (ctx) => invoke('getFailedSettlements', ctx);
const getExpectedIncome = (ctx) => invoke('getExpectedIncome', ctx);
const getOverdueIncome = (ctx) => invoke('getOverdueIncome', ctx);
const getUpcomingMaturities = (ctx) => invoke('getUpcomingMaturities', ctx);
const getDistributionSummary = (ctx) => invoke('getDistributionSummary', ctx);
const getInvestorCapitalAccount = (ctx) => invoke('getInvestorCapitalAccount', ctx);
const getRiskBreaches = (ctx) => invoke('getRiskBreaches', ctx);
const getReconciliationExceptions = (ctx) => invoke('getReconciliationExceptions', ctx);
const getMonthEndExceptions = (ctx) => invoke('getMonthEndExceptions', ctx);
const comparePortfolioToBenchmark = (ctx) => invoke('comparePortfolioToBenchmark', ctx);
const explainRealizedGainLoss = (ctx) => invoke('explainRealizedGainLoss', ctx);
const explainNAVMovement = (ctx) => invoke('explainNAVMovement', ctx);

module.exports = {
  getInvestmentPortfolioSummary,
  getInvestmentHoldingDetails,
  getUpcomingInvestmentMaturities,
  getPortfolioSummary,
  getPortfolioPerformance,
  getHoldingDetails,
  getInstrumentDetails,
  getPendingSettlements,
  getFailedSettlements,
  getExpectedIncome,
  getOverdueIncome,
  getUpcomingMaturities,
  getDistributionSummary,
  getInvestorCapitalAccount,
  getRiskBreaches,
  getReconciliationExceptions,
  getMonthEndExceptions,
  comparePortfolioToBenchmark,
  explainRealizedGainLoss,
  explainNAVMovement,
};
