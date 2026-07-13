'use strict';

const {
  sequelize,
  InvestmentValuationBatch,
  InvestmentValuationBatchLine,
  InvestmentMarketPrice,
  InvestmentBenchmark,
  InvestmentNavSnapshot,
  InvestmentPerformancePeriod,
  InvestmentHoldingV2,
  InvestmentInstrument,
  InvestmentPortfolio,
  InvestmentOwnershipHistory,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const {
  selectBestPrice,
  sourcePriority,
  detectPriceExceptions,
  computeLineMarketValue,
  computeNAV,
  investorNAV,
  navMovement,
  computePerformancePeriod,
  canTransitionBatch,
  validateImportRows,
  round2,
} = require('./performanceEngine.service');
const { ownershipAsOf } = require('../capital/capitalEngine.service');
const reconCloseService = require('../reconciliation/investmentReconClose.service');
const { Op } = require('sequelize');

async function nextNumber(Model, companyId, prefix) {
  const count = await Model.count({ where: { companyId } });
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

// ——— Market prices ———
async function upsertMarketPrice(req, data) {
  if (!data.instrumentId || !data.priceDate) {
    const err = new Error('instrumentId and priceDate required');
    err.statusCode = 400;
    throw err;
  }
  const source = data.source || 'MANUAL';
  const existing = await InvestmentMarketPrice.findOne({
    where: {
      instrumentId: data.instrumentId,
      priceDate: data.priceDate,
      source,
      ...companyWhere(req),
    },
  });
  const payload = {
    priceType: data.priceType || 'CLOSE',
    bid: data.bid ?? null,
    ask: data.ask ?? null,
    close: data.close ?? data.price ?? null,
    mid: data.mid ?? null,
    nav: data.nav ?? null,
    source,
    sourcePriority: data.sourcePriority != null ? data.sourcePriority : sourcePriority(source),
    currencyCode: data.currencyCode || 'AED',
    confidenceScore: data.confidenceScore ?? null,
    staleFlag: !!data.staleFlag,
    isTestData: !!data.isTestData,
  };
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return existing;
  }
  return InvestmentMarketPrice.create(
    withCompanyId(req, {
      instrumentId: data.instrumentId,
      priceDate: data.priceDate,
      ...payload,
    })
  );
}

async function listMarketPrices(req) {
  const { page, limit, offset } = parsePagination(req.query, 50, 200);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.instrumentId) where.instrumentId = Number(req.query.instrumentId);
  if (req.query.priceDate) where.priceDate = req.query.priceDate;
  const { count, rows } = await InvestmentMarketPrice.findAndCountAll({
    where,
    include: [{ model: InvestmentInstrument, as: 'instrument', attributes: ['id', 'instrumentCode', 'instrumentName'] }],
    order: [['priceDate', 'DESC'], ['sourcePriority', 'ASC']],
    limit,
    offset,
  });
  return { prices: rows, pagination: paginationMeta(count, page, limit) };
}

async function importMarketPrices(req, data = {}) {
  const rows = data.rows || [];
  const validation = validateImportRows(rows, {
    lockedDates: data.lockedDates || [],
    preventDuplicates: true,
  });
  if (!validation.valid && data.force !== true) {
    return { imported: 0, ...validation };
  }
  const created = [];
  for (const row of rows) {
    let instrumentId = row.instrumentId;
    if (!instrumentId && row.instrumentCode) {
      const inst = await InvestmentInstrument.findOne({
        where: { instrumentCode: row.instrumentCode, ...companyWhere(req) },
      });
      instrumentId = inst?.id;
    }
    if (!instrumentId) continue;
    const price = await upsertMarketPrice(req, {
      ...row,
      instrumentId,
      source: data.source || row.source || 'IMPORT',
      isTestData: !!data.isTestData,
    });
    created.push(price);
  }
  return { imported: created.length, prices: created, ...validation };
}

// ——— Valuation batches ———
async function listValuationBatches(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.status) where.status = req.query.status;
  const { count, rows } = await InvestmentValuationBatch.findAndCountAll({
    where,
    include: [{ model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] }],
    order: [['valuationDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { batches: rows, pagination: paginationMeta(count, page, limit) };
}

async function getValuationBatch(req, id) {
  const batch = await InvestmentValuationBatch.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentPortfolio, as: 'portfolio' },
      {
        model: InvestmentValuationBatchLine,
        as: 'lines',
        include: [{ model: InvestmentInstrument, as: 'instrument', attributes: ['id', 'instrumentCode', 'instrumentName'] }],
      },
    ],
  });
  if (!batch) {
    const err = new Error('Valuation batch not found');
    err.statusCode = 404;
    throw err;
  }
  return batch;
}

async function createValuationBatch(req, data) {
  if (!data.portfolioId || !data.valuationDate) {
    const err = new Error('portfolioId and valuationDate required');
    err.statusCode = 400;
    throw err;
  }
  return sequelize.transaction(async (transaction) => {
    const batch = await InvestmentValuationBatch.create(
      withCompanyId(req, {
        portfolioId: data.portfolioId,
        valuationNumber: data.valuationNumber || (await nextNumber(InvestmentValuationBatch, req.companyId, 'VALB')),
        valuationDate: data.valuationDate,
        valuationType: data.valuationType || 'MARK_TO_MARKET',
        sourceType: data.sourceType || 'MANUAL',
        status: 'DRAFT',
        createdBy: req.user?.id || null,
        remarks: data.remarks || null,
        isTestData: !!data.isTestData,
      }),
      { transaction }
    );

    const holdings = await InvestmentHoldingV2.findAll({
      where: { portfolioId: data.portfolioId, ...companyWhere(req), quantity: { [Op.gt]: 0 } },
      transaction,
    });

    const opts = {
      staleDays: data.staleDays != null ? data.staleDays : 5,
      changeTolerancePct: data.changeTolerancePct != null ? data.changeTolerancePct : 20,
    };

    let totalCost = 0;
    let totalMv = 0;
    let exceptions = 0;

    for (const h of holdings) {
      const prices = await InvestmentMarketPrice.findAll({
        where: { instrumentId: h.instrumentId, ...companyWhere(req) },
        transaction,
      });
      const best = selectBestPrice(prices, data.valuationDate, opts);
      const price = best ? Number(best.value) : Number(data.manualPrices?.[h.instrumentId] || h.currentPrice || 0);
      const prior = best && best.priceDate < data.valuationDate
        ? Number(best.value)
        : Number(h.currentPrice || 0);
      // prior from previous batch line if available
      const priorPrice = Number(h.currentPrice || prior || 0);
      const ex = detectPriceExceptions({
        price: price || null,
        priorPrice: priorPrice || null,
        quantity: h.quantity,
        opts: { ...opts, stale: best?.stale },
      });
      const mv = computeLineMarketValue(h.quantity, price || 0, h.totalCost);
      const status = ex.some((e) => e.code === 'MISSING_PRICE')
        ? 'EXCEPTION'
        : ex.length
          ? 'WARNING'
          : 'OK';
      if (status === 'EXCEPTION' || status === 'WARNING') exceptions += 1;

      await InvestmentValuationBatchLine.create(
        withCompanyId(req, {
          batchId: batch.id,
          instrumentId: h.instrumentId,
          holdingV2Id: h.id,
          quantity: h.quantity,
          cost: h.totalCost,
          price: price || 0,
          priorPrice: priorPrice || null,
          marketValue: mv.marketValue,
          unrealizedGainLoss: mv.unrealizedGainLoss,
          priceSource: best?.source || data.sourceType || 'MANUAL',
          exceptionCode: ex[0]?.code || null,
          exceptionMessage: ex.map((e) => e.message).join('; ') || null,
          status,
        }),
        { transaction }
      );
      totalCost = round2(totalCost + Number(h.totalCost));
      totalMv = round2(totalMv + mv.marketValue);
    }

    batch.totalCost = totalCost;
    batch.totalMarketValue = totalMv;
    batch.totalUnrealizedGainLoss = round2(totalMv - totalCost);
    batch.exceptionCount = exceptions;
    batch.status = exceptions > 0 ? 'EXCEPTION' : 'VALIDATED';
    await batch.save({ transaction });
    return getValuationBatch(req, batch.id);
  });
}

async function validateValuationBatch(req, id) {
  const batch = await getValuationBatch(req, id);
  if (!canTransitionBatch(batch.status, 'VALIDATED') && batch.status !== 'EXCEPTION') {
    const err = new Error(`Cannot validate from ${batch.status}`);
    err.statusCode = 400;
    throw err;
  }
  const openExceptions = (batch.lines || []).filter((l) => l.status === 'EXCEPTION').length;
  batch.exceptionCount = openExceptions;
  batch.status = openExceptions > 0 ? 'EXCEPTION' : 'VALIDATED';
  await batch.save();
  return getValuationBatch(req, id);
}

async function approveValuationBatch(req, id) {
  const batch = await InvestmentValuationBatch.findOne({ where: { id, ...companyWhere(req) } });
  if (!batch) {
    const err = new Error('Valuation batch not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionBatch(batch.status, 'APPROVED')) {
    const err = new Error(`Cannot approve from ${batch.status}`);
    err.statusCode = 400;
    throw err;
  }
  if (req.user?.id && batch.createdBy && Number(req.user.id) === Number(batch.createdBy) && !req.body?.force) {
    const err = new Error('Four-eyes: approver must differ from creator');
    err.statusCode = 400;
    throw err;
  }
  batch.status = 'APPROVED';
  batch.approvedBy = req.user?.id || null;
  await batch.save();
  return getValuationBatch(req, id);
}

async function postValuationBatch(req, id) {
  return sequelize.transaction(async (transaction) => {
    const batch = await InvestmentValuationBatch.findOne({
      where: { id, ...companyWhere(req) },
      include: [{ model: InvestmentValuationBatchLine, as: 'lines' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!batch) {
      const err = new Error('Valuation batch not found');
      err.statusCode = 404;
      throw err;
    }
    if (!canTransitionBatch(batch.status, 'POSTED')) {
      const err = new Error(`Cannot post from ${batch.status}`);
      err.statusCode = 400;
      throw err;
    }
    await reconCloseService.checkPeriodLock(req, {
      period: String(batch.valuationDate).slice(0, 7),
      portfolioId: batch.portfolioId,
    });
    for (const line of batch.lines || []) {
      if (!line.holdingV2Id) continue;
      const holding = await InvestmentHoldingV2.findOne({
        where: { id: line.holdingV2Id, ...companyWhere(req) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!holding) continue;
      holding.currentPrice = line.price;
      holding.currentMarketValue = line.marketValue;
      holding.unrealizedGainLoss = line.unrealizedGainLoss;
      holding.lastValuationDate = batch.valuationDate;
      await holding.save({ transaction });
    }
    batch.status = 'POSTED';
    batch.postedAt = new Date();
    await batch.save({ transaction });
    return getValuationBatch(req, id);
  });
}

async function fixValuationLine(req, lineId, data = {}) {
  const line = await InvestmentValuationBatchLine.findOne({
    where: { id: lineId, ...companyWhere(req) },
  });
  if (!line) {
    const err = new Error('Valuation line not found');
    err.statusCode = 404;
    throw err;
  }
  if (data.price != null) {
    line.price = Number(data.price);
    const mv = computeLineMarketValue(line.quantity, line.price, line.cost);
    line.marketValue = mv.marketValue;
    line.unrealizedGainLoss = mv.unrealizedGainLoss;
  }
  line.status = 'FIXED';
  line.exceptionCode = null;
  line.exceptionMessage = data.remarks || 'Manually fixed';
  await line.save();

  const batch = await InvestmentValuationBatch.findOne({ where: { id: line.batchId, ...companyWhere(req) } });
  const lines = await InvestmentValuationBatchLine.findAll({
    where: { batchId: line.batchId, ...companyWhere(req) },
  });
  batch.totalMarketValue = round2(lines.reduce((s, l) => s + Number(l.marketValue), 0));
  batch.totalCost = round2(lines.reduce((s, l) => s + Number(l.cost), 0));
  batch.totalUnrealizedGainLoss = round2(batch.totalMarketValue - batch.totalCost);
  batch.exceptionCount = lines.filter((l) => l.status === 'EXCEPTION').length;
  if (batch.exceptionCount === 0 && ['EXCEPTION', 'DRAFT', 'IMPORTED'].includes(batch.status)) {
    batch.status = 'VALIDATED';
  }
  await batch.save();
  return getValuationBatch(req, line.batchId);
}

// ——— NAV ———
async function computeAndSaveNav(req, data = {}) {
  if (!data.portfolioId || !data.navDate) {
    const err = new Error('portfolioId and navDate required');
    err.statusCode = 400;
    throw err;
  }
  const holdings = await InvestmentHoldingV2.findAll({
    where: { portfolioId: data.portfolioId, ...companyWhere(req) },
  });
  const marketValue = round2(holdings.reduce((s, h) => s + Number(h.currentMarketValue || 0), 0));
  const navParts = computeNAV({
    marketValue,
    cash: data.cash || 0,
    receivables: data.receivables || 0,
    accruedIncome: data.accruedIncome || 0,
    payables: data.payables || 0,
    fees: data.fees || 0,
    liabilities: data.liabilities || 0,
    units: data.units,
  });

  const snap = await InvestmentNavSnapshot.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId,
      investorId: null,
      navDate: data.navDate,
      ...navParts,
      valuationBatchId: data.valuationBatchId || null,
      status: data.status || 'DRAFT',
      isTestData: !!data.isTestData,
    })
  );

  const investorSnaps = [];
  if (data.includeInvestors) {
    const history = await InvestmentOwnershipHistory.findAll({
      where: { portfolioId: data.portfolioId, ...companyWhere(req) },
    });
    const owners = ownershipAsOf(history, data.navDate);
    for (const o of owners) {
      const invNav = investorNAV(navParts.nav, o.ownershipPercentage);
      const row = await InvestmentNavSnapshot.create(
        withCompanyId(req, {
          portfolioId: data.portfolioId,
          investorId: o.investorId,
          navDate: data.navDate,
          marketValue: round2((marketValue * Number(o.ownershipPercentage)) / 100),
          cash: round2((navParts.cash * Number(o.ownershipPercentage)) / 100),
          receivables: 0,
          accruedIncome: 0,
          payables: 0,
          fees: 0,
          liabilities: 0,
          nav: invNav,
          units: null,
          navPerUnit: null,
          valuationBatchId: data.valuationBatchId || null,
          status: data.status || 'DRAFT',
          isTestData: !!data.isTestData,
        })
      );
      investorSnaps.push(row);
    }
  }

  let movement = null;
  const prior = await InvestmentNavSnapshot.findOne({
    where: {
      portfolioId: data.portfolioId,
      investorId: null,
      ...companyWhere(req),
      navDate: { [Op.lt]: data.navDate },
    },
    order: [['navDate', 'DESC']],
  });
  if (prior) {
    movement = navMovement(prior.nav, navParts.nav, {
      contributions: data.contributions || 0,
      distributions: data.distributions || 0,
      income: data.income || 0,
    });
  }

  return { snapshot: snap, investorSnapshots: investorSnaps, movement, components: navParts };
}

async function listNavSnapshots(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.investorId) where.investorId = Number(req.query.investorId);
  if (req.query.navDate) where.navDate = req.query.navDate;
  const rows = await InvestmentNavSnapshot.findAll({
    where,
    include: [{ model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] }],
    order: [['navDate', 'DESC']],
    limit: 100,
  });
  return { snapshots: rows };
}

// ——— Performance ———
async function calculatePerformance(req, data = {}) {
  if (!data.portfolioId || !data.periodStart || !data.periodEnd) {
    const err = new Error('portfolioId, periodStart, periodEnd required');
    err.statusCode = 400;
    throw err;
  }
  const metrics = computePerformancePeriod({
    openingValue: data.openingValue,
    closingValue: data.closingValue,
    externalFlows: data.externalFlows,
    income: data.income,
    realizedGainLoss: data.realizedGainLoss,
    unrealizedGainLoss: data.unrealizedGainLoss,
    subPeriodReturns: data.subPeriodReturns,
    navSeries: data.navSeries,
    flowSeries: data.flowSeries,
    cashflows: data.cashflows,
    daysInPeriod: data.daysInPeriod,
    benchmarkReturn: data.benchmarkReturn,
    returns: data.returns,
    values: data.values,
    riskFreeRate: data.riskFreeRate,
    flowWeight: data.flowWeight,
  });

  const period = await InvestmentPerformancePeriod.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      openingValue: Number(data.openingValue || 0),
      closingValue: Number(data.closingValue || 0),
      externalFlows: Number(data.externalFlows || 0),
      income: Number(data.income || 0),
      realizedGainLoss: Number(data.realizedGainLoss || 0),
      unrealizedGainLoss: Number(data.unrealizedGainLoss || 0),
      twr: metrics.twr,
      mwr: metrics.mwr,
      irr: metrics.irr,
      absoluteReturn: metrics.absoluteReturn,
      annualizedReturn: metrics.annualizedReturn,
      benchmarkReturn: metrics.benchmarkReturn,
      excessReturn: metrics.excessReturn,
      volatility: metrics.volatility,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      isTestData: !!data.isTestData,
    })
  );
  return { period, metrics };
}

async function listPerformancePeriods(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  const rows = await InvestmentPerformancePeriod.findAll({
    where,
    include: [{ model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] }],
    order: [['periodEnd', 'DESC']],
    limit: 50,
  });
  return { periods: rows };
}

async function listBenchmarks(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  const rows = await InvestmentBenchmark.findAll({ where, order: [['code', 'ASC']] });
  return { benchmarks: rows };
}

async function createBenchmark(req, data) {
  return InvestmentBenchmark.create(
    withCompanyId(req, {
      code: data.code || `BM-${Date.now().toString().slice(-6)}`,
      name: data.name || 'Benchmark',
      provider: data.provider || null,
      currency: data.currency || 'AED',
      returnSeriesJson: data.returnSeries ? JSON.stringify(data.returnSeries) : null,
      status: data.status || 'ACTIVE',
      isTestData: !!data.isTestData,
    })
  );
}

module.exports = {
  upsertMarketPrice,
  listMarketPrices,
  importMarketPrices,
  listValuationBatches,
  getValuationBatch,
  createValuationBatch,
  validateValuationBatch,
  approveValuationBatch,
  postValuationBatch,
  fixValuationLine,
  computeAndSaveNav,
  listNavSnapshots,
  calculatePerformance,
  listPerformancePeriods,
  listBenchmarks,
  createBenchmark,
};
