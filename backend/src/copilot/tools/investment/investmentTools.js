'use strict';

const { Op } = require('sequelize');
const { InvestmentAsset, InvestmentHolding } = require('../../../models');

const MAX_ROWS = 25;

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

module.exports = {
  getInvestmentPortfolioSummary,
  getInvestmentHoldingDetails,
  getUpcomingInvestmentMaturities,
};
