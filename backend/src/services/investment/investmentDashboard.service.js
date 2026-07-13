const { Op } = require('sequelize');
const {
  InvestmentAsset,
  InvestmentHolding,
  InvestmentTransaction,
  InvestmentPartnerAllocation,
  InvestmentValuationHistory,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const { round2 } = require('./investmentFinancePostingUtils');
const { testDataWhere } = require('./shared/investmentQueryScope');

async function getDashboard(req) {
  const companyFilter = companyWhere(req);
  const testFilter = testDataWhere(req);

  const holdings = await InvestmentHolding.findAll({
    where: companyFilter,
    include: [
      {
        model: InvestmentAsset,
        as: 'asset',
        attributes: ['id', 'assetType', 'currencyCode', 'status', 'maturityDate', 'isTestData', 'isArchived'],
        required: true,
        where: {
          ...testFilter,
          isArchived: false,
          status: { [Op.ne]: 'CLOSED' },
        },
      },
    ],
  });

  let totalInvestedCost = 0;
  let currentMarketValue = 0;
  let unrealizedGainLoss = 0;
  let realizedGainLoss = 0;
  const byAssetType = {};
  const byCurrency = {};
  const mvByAssetId = {};

  for (const h of holdings) {
    const mv = Number(h.currentMarketValue || 0);
    totalInvestedCost += Number(h.totalCost || 0);
    currentMarketValue += mv;
    unrealizedGainLoss += Number(h.unrealizedGainLoss || 0);
    realizedGainLoss += Number(h.realizedGainLoss || 0);
    mvByAssetId[h.investmentAssetId] = mv;
    const type = h.asset?.assetType || 'Other';
    byAssetType[type] = (byAssetType[type] || 0) + mv;
    const cur = h.asset?.currencyCode || 'AED';
    byCurrency[cur] = (byCurrency[cur] || 0) + Number(h.baseCurrencyValue || mv || 0);
  }

  const dividendsReceived =
    (await InvestmentTransaction.sum('base_amount', {
      where: {
        ...companyFilter,
        ...testFilter,
        transactionType: { [Op.in]: ['DIVIDEND', 'INTEREST'] },
        postingStatus: 'POSTED',
      },
    })) || 0;

  const roi =
    totalInvestedCost > 0
      ? round2(
          ((currentMarketValue + Number(dividendsReceived) + realizedGainLoss - totalInvestedCost) /
            totalInvestedCost) *
            100
        )
      : 0;

  const activeAssets = await InvestmentAsset.count({
    where: { ...companyFilter, ...testFilter, isArchived: false, status: 'ACTIVE' },
  });

  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const maturityCutoff = thirtyDays.toISOString().slice(0, 10);
  const maturingAssets = await InvestmentAsset.findAll({
    where: {
      ...companyFilter,
      ...testFilter,
      isArchived: false,
      status: 'ACTIVE',
      maturityDate: { [Op.lte]: maturityCutoff, [Op.ne]: null },
    },
    attributes: ['id', 'investmentCode', 'investmentName', 'maturityDate', 'assetType', 'currencyCode'],
    order: [['maturityDate', 'ASC']],
    limit: 10,
  });
  const maturingSoon = maturingAssets.length;

  const partnerRows = await InvestmentPartnerAllocation.findAll({
    where: { ...companyFilter, ...testFilter, isActive: true },
    attributes: ['investorName', 'investorType', 'ownershipPercentage', 'investmentAssetId'],
  });

  // Market-value-weighted partner exposure (never raw sum of ownership %)
  const exposureValue = {};
  let totalWeightedMv = 0;
  for (const p of partnerRows) {
    const assetMv = Number(mvByAssetId[p.investmentAssetId] || 0);
    const share = assetMv * (Number(p.ownershipPercentage || 0) / 100);
    const key = p.investorName || 'Unknown';
    exposureValue[key] = (exposureValue[key] || 0) + share;
    totalWeightedMv += share;
  }
  const partnerExposure = Object.entries(exposureValue).map(([name, value]) => ({
    name,
    marketValue: round2(value),
    ownershipPercentage:
      totalWeightedMv > 0 ? round2((value / totalWeightedMv) * 100) : 0,
  }));

  const performanceTrend = await buildPerformanceTrend(
    { ...companyFilter, ...testFilter },
    totalInvestedCost,
    currentMarketValue
  );

  return {
    kpis: {
      totalInvestedCost: round2(totalInvestedCost),
      currentMarketValue: round2(currentMarketValue),
      realizedGainLoss: round2(realizedGainLoss),
      unrealizedGainLoss: round2(unrealizedGainLoss),
      dividendsReceived: round2(dividendsReceived),
      roi,
      activeAssets,
      maturingSoon,
    },
    assetAllocation: Object.entries(byAssetType).map(([name, value]) => ({ name, value: round2(value) })),
    currencyExposure: Object.entries(byCurrency).map(([currency, value]) => ({
      currency,
      value: round2(value),
    })),
    partnerExposure,
    performanceTrend,
    maturityCalendar: maturingAssets.map((a) => ({
      id: a.id,
      investmentCode: a.investmentCode,
      investmentName: a.investmentName,
      maturityDate: a.maturityDate,
      assetType: a.assetType,
      currencyCode: a.currencyCode,
    })),
  };
}

async function buildPerformanceTrend(companyFilter, totalCost, currentMarketValue) {
  const valuations = await InvestmentValuationHistory.findAll({
    where: { ...companyFilter, approvalStatus: 'APPROVED' },
    attributes: ['valuationDate', 'baseMarketValue'],
    order: [['valuationDate', 'ASC']],
  });

  if (valuations.length > 0) {
    const byMonth = {};
    for (const v of valuations) {
      const period = String(v.valuationDate).slice(0, 7);
      byMonth[period] = (byMonth[period] || 0) + Number(v.baseMarketValue || 0);
    }
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, marketValue]) => ({
        period,
        marketValue: round2(marketValue),
        cost: round2(totalCost),
      }));
  }

  const buys = await InvestmentTransaction.findAll({
    where: {
      ...companyFilter,
      transactionType: 'BUY',
      postingStatus: { [Op.ne]: 'CANCELLED' },
    },
    attributes: ['transactionDate', 'baseAmount'],
    order: [['transactionDate', 'ASC']],
  });

  if (buys.length === 0 && totalCost <= 0) return [];

  const byMonth = {};
  let cumulative = 0;
  for (const t of buys) {
    cumulative += Number(t.baseAmount || 0);
    const period = String(t.transactionDate).slice(0, 7);
    byMonth[period] = round2(cumulative);
  }

  const periods = Object.keys(byMonth).sort();
  if (periods.length === 0) {
    const now = new Date().toISOString().slice(0, 7);
    return [{ period: now, cost: round2(totalCost), marketValue: round2(currentMarketValue) }];
  }

  const latest = periods[periods.length - 1];
  return periods.map((period) => ({
    period,
    cost: byMonth[period],
    marketValue: period === latest ? round2(currentMarketValue) : byMonth[period],
  }));
}

/** Pure helper for unit tests — MV-weighted partner exposure */
function computePartnerExposure(allocations, mvByAssetId) {
  const exposureValue = {};
  let totalWeightedMv = 0;
  for (const p of allocations) {
    const assetMv = Number(mvByAssetId[p.investmentAssetId] || 0);
    const share = assetMv * (Number(p.ownershipPercentage || 0) / 100);
    const key = p.investorName || 'Unknown';
    exposureValue[key] = (exposureValue[key] || 0) + share;
    totalWeightedMv += share;
  }
  return Object.entries(exposureValue).map(([name, value]) => ({
    name,
    marketValue: round2(value),
    ownershipPercentage: totalWeightedMv > 0 ? round2((value / totalWeightedMv) * 100) : 0,
  }));
}

module.exports = { getDashboard, computePartnerExposure };
