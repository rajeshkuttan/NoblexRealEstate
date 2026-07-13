'use strict';

/**
 * Pure valuation / NAV / performance helpers (Phase 21).
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function round6(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1e6) / 1e6;
}

function round10(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1e10) / 1e10;
}

/** Source hierarchy: lower priority number wins (1 = highest). */
const DEFAULT_SOURCE_PRIORITY = {
  CUSTODIAN: 10,
  BROKER: 20,
  EXCHANGE: 30,
  API: 40,
  IMPORT: 50,
  MANUAL: 100,
};

function sourcePriority(source) {
  const key = String(source || 'MANUAL').toUpperCase();
  return DEFAULT_SOURCE_PRIORITY[key] != null ? DEFAULT_SOURCE_PRIORITY[key] : 100;
}

/**
 * Pick best price for an instrument on a date from candidate rows.
 * Prefer exact date, then highest source priority (lowest number), then non-stale.
 */
function selectBestPrice(candidates, asOfDate, opts = {}) {
  const asOf = String(asOfDate).slice(0, 10);
  const staleDays = Number(opts.staleDays != null ? opts.staleDays : 5);
  const rows = (candidates || [])
    .map((p) => ({
      ...p,
      priceDate: String(p.priceDate || p.price_date || '').slice(0, 10),
      source: String(p.source || 'MANUAL').toUpperCase(),
      priority: Number(p.sourcePriority ?? p.source_priority ?? sourcePriority(p.source)),
      staleFlag: !!(p.staleFlag ?? p.stale_flag),
      value: pickPriceValue(p, opts.priceType),
    }))
    .filter((p) => p.priceDate && p.priceDate <= asOf && p.value != null && !Number.isNaN(Number(p.value)));

  if (!rows.length) return null;

  rows.sort((a, b) => {
    if (a.priceDate !== b.priceDate) return a.priceDate > b.priceDate ? -1 : 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.staleFlag !== b.staleFlag) return a.staleFlag ? 1 : -1;
    return 0;
  });

  const best = rows[0];
  const ageDays = daysBetween(best.priceDate, asOf);
  const stale = best.staleFlag || ageDays > staleDays;
  return {
    ...best,
    ageDays,
    stale,
    exception: stale ? 'STALE_PRICE' : null,
  };
}

function pickPriceValue(p, priceType = 'CLOSE') {
  const type = String(priceType || 'CLOSE').toUpperCase();
  if (type === 'BID') return p.bid != null ? Number(p.bid) : null;
  if (type === 'ASK') return p.ask != null ? Number(p.ask) : null;
  if (type === 'MID') {
    if (p.mid != null) return Number(p.mid);
    if (p.bid != null && p.ask != null) return round6((Number(p.bid) + Number(p.ask)) / 2);
    return null;
  }
  if (type === 'NAV') return p.nav != null ? Number(p.nav) : null;
  // CLOSE default
  if (p.close != null) return Number(p.close);
  if (p.mid != null) return Number(p.mid);
  if (p.nav != null) return Number(p.nav);
  return null;
}

function daysBetween(a, b) {
  const [ay, am, ad] = String(a).slice(0, 10).split('-').map(Number);
  const [by, bm, bd] = String(b).slice(0, 10).split('-').map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db = Date.UTC(by, bm - 1, bd);
  return Math.max(0, Math.round((db - da) / 86400000));
}

function priceChangePct(prior, current) {
  const p = Number(prior);
  const c = Number(current);
  if (!(p > 0)) return null;
  return round6(((c - p) / p) * 100);
}

function detectPriceExceptions({ price, priorPrice, quantity, opts = {} }) {
  const exceptions = [];
  const tolerancePct = Number(opts.changeTolerancePct != null ? opts.changeTolerancePct : 20);
  const staleDays = Number(opts.staleDays != null ? opts.staleDays : 5);

  if (price == null || Number.isNaN(Number(price))) {
    exceptions.push({ code: 'MISSING_PRICE', message: 'No price available' });
    return exceptions;
  }
  if (opts.stale) {
    exceptions.push({
      code: 'STALE_PRICE',
      message: `Price older than ${staleDays} days`,
    });
  }
  if (priorPrice != null && Number(priorPrice) > 0) {
    const chg = priceChangePct(priorPrice, price);
    if (chg != null && Math.abs(chg) > tolerancePct) {
      exceptions.push({
        code: 'OUTLIER',
        message: `Price change ${chg}% exceeds tolerance ${tolerancePct}%`,
        changePct: chg,
      });
    }
  }
  if (Number(quantity) <= 0) {
    exceptions.push({ code: 'ZERO_QUANTITY', message: 'Holding quantity is zero' });
  }
  return exceptions;
}

function computeLineMarketValue(quantity, price, cost) {
  const mv = round2(Number(quantity) * Number(price));
  const c = round2(Number(cost || 0));
  return {
    marketValue: mv,
    unrealizedGainLoss: round2(mv - c),
  };
}

/**
 * NAV = MV + cash + receivables + accrued - payables - fees - liabilities
 */
function computeNAV(components = {}) {
  const marketValue = Number(components.marketValue || 0);
  const cash = Number(components.cash || 0);
  const receivables = Number(components.receivables || 0);
  const accruedIncome = Number(components.accruedIncome || 0);
  const payables = Number(components.payables || 0);
  const fees = Number(components.fees || 0);
  const liabilities = Number(components.liabilities || 0);
  const nav = round2(marketValue + cash + receivables + accruedIncome - payables - fees - liabilities);
  const units = components.units != null ? Number(components.units) : null;
  const navPerUnit = units && units > 0 ? round6(nav / units) : null;
  return {
    marketValue: round2(marketValue),
    cash: round2(cash),
    receivables: round2(receivables),
    accruedIncome: round2(accruedIncome),
    payables: round2(payables),
    fees: round2(fees),
    liabilities: round2(liabilities),
    nav,
    units,
    navPerUnit,
  };
}

function investorNAV(portfolioNav, ownershipPct) {
  const pct = Number(ownershipPct || 0);
  return round2((Number(portfolioNav) * pct) / 100);
}

function navMovement(priorNav, currentNav, flows = {}) {
  const prior = Number(priorNav || 0);
  const current = Number(currentNav || 0);
  const contributions = Number(flows.contributions || 0);
  const distributions = Number(flows.distributions || 0);
  const income = Number(flows.income || 0);
  const unexplained = round2(current - prior - contributions + distributions - income);
  return {
    prior,
    current,
    change: round2(current - prior),
    contributions,
    distributions,
    income,
    marketMove: unexplained,
  };
}

/** Absolute return (ending - beginning - flows) / beginning */
function absoluteReturn(opening, closing, externalFlows = 0) {
  const o = Number(opening);
  if (!(o > 0)) return null;
  return round10((Number(closing) - o - Number(externalFlows)) / o);
}

/**
 * Simple Dietz / modified Dietz MWR approximation for one period.
 * MWR ≈ (EMV - BMV - CF) / (BMV + Σ(CF_i * w_i))
 * If only total CF known mid-period weight 0.5.
 */
function moneyWeightedReturn(opening, closing, externalFlows, weight = 0.5) {
  const bmv = Number(opening);
  const emv = Number(closing);
  const cf = Number(externalFlows);
  const denom = bmv + cf * Number(weight);
  if (!(denom > 0) && !(denom < 0)) return null;
  return round10((emv - bmv - cf) / denom);
}

/**
 * Time-weighted return from sub-period returns (geometric link).
 * subReturns as decimals e.g. 0.02 for +2%.
 */
function timeWeightedReturn(subPeriodReturns) {
  const arr = subPeriodReturns || [];
  if (!arr.length) return null;
  let factor = 1;
  for (const r of arr) {
    factor *= 1 + Number(r);
  }
  return round10(factor - 1);
}

/**
 * Build sub-period returns from NAV points with flows at dates.
 * points: [{ date, value }], flows: [{ date, amount }] (positive = contribution)
 */
function twrFromNavSeries(points, flows = []) {
  const series = [...(points || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (series.length < 2) return null;
  const flowByDate = new Map();
  for (const f of flows) {
    const d = String(f.date).slice(0, 10);
    flowByDate.set(d, Number(flowByDate.get(d) || 0) + Number(f.amount || 0));
  }
  const subs = [];
  for (let i = 1; i < series.length; i++) {
    const prev = Number(series[i - 1].value);
    const cur = Number(series[i].value);
    const cf = Number(flowByDate.get(String(series[i].date).slice(0, 10)) || 0);
    // Return before flow: (end - flow - start) / start  OR if flow at start of day: (end - start - flow)/(start+flow)
    const startAdj = prev;
    if (!(startAdj > 0)) continue;
    const r = (cur - cf - startAdj) / startAdj;
    subs.push(r);
  }
  return timeWeightedReturn(subs);
}

/**
 * Newton-Raphson IRR for cashflows: [{ amount, days }] or period units.
 * amounts signed: negative = outflow (investment), positive = inflow.
 * Returns periodic rate; annualize with periodsPerYear if set.
 */
function irr(cashflows, guess = 0.1, maxIter = 100, tol = 1e-10) {
  const cfs = (cashflows || []).map((c) => ({
    amount: Number(c.amount),
    t: Number(c.t != null ? c.t : c.days != null ? c.days / 365 : c.period || 0),
  }));
  if (cfs.length < 2) return null;

  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dnpv = 0;
    for (const cf of cfs) {
      const denom = Math.pow(1 + rate, cf.t);
      npv += cf.amount / denom;
      dnpv -= (cf.t * cf.amount) / (denom * (1 + rate));
    }
    if (Math.abs(dnpv) < 1e-14) break;
    const next = rate - npv / dnpv;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < tol) {
      return round10(next);
    }
    rate = next;
  }
  return round10(rate);
}

function annualizeReturn(periodReturn, daysInPeriod, dayCount = 365) {
  const r = Number(periodReturn);
  const days = Number(daysInPeriod);
  if (!(days > 0) || r == null || Number.isNaN(r)) return null;
  const years = days / Number(dayCount);
  if (!(years > 0)) return null;
  return round10(Math.pow(1 + r, 1 / years) - 1);
}

function excessReturn(portfolioReturn, benchmarkReturn) {
  if (portfolioReturn == null || benchmarkReturn == null) return null;
  return round10(Number(portfolioReturn) - Number(benchmarkReturn));
}

function volatility(returns) {
  const arr = (returns || []).map(Number).filter((x) => Number.isFinite(x));
  if (arr.length < 2) return null;
  const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
  const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / (arr.length - 1);
  return round10(Math.sqrt(variance));
}

function maxDrawdown(values) {
  const arr = (values || []).map(Number);
  if (!arr.length) return null;
  let peak = arr[0];
  let maxDd = 0;
  for (const v of arr) {
    if (v > peak) peak = v;
    if (peak > 0) {
      const dd = (peak - v) / peak;
      if (dd > maxDd) maxDd = dd;
    }
  }
  return round10(maxDd);
}

function sharpeRatio(periodReturn, riskFreeRate, vol) {
  if (periodReturn == null || vol == null || !(Number(vol) > 0)) return null;
  return round10((Number(periodReturn) - Number(riskFreeRate || 0)) / Number(vol));
}

function capitalReturn(opening, closing, income = 0, externalFlows = 0) {
  const o = Number(opening);
  if (!(o > 0)) return null;
  return round10((Number(closing) - o - Number(externalFlows) - Number(income)) / o);
}

function incomeReturn(opening, income) {
  const o = Number(opening);
  if (!(o > 0)) return null;
  return round10(Number(income) / o);
}

function totalReturn(opening, closing, externalFlows = 0) {
  return absoluteReturn(opening, closing, externalFlows);
}

function computePerformancePeriod(input = {}) {
  const opening = Number(input.openingValue || 0);
  const closing = Number(input.closingValue || 0);
  const flows = Number(input.externalFlows || 0);
  const income = Number(input.income || 0);
  const abs = absoluteReturn(opening, closing, flows);
  const mwr = moneyWeightedReturn(opening, closing, flows, input.flowWeight);
  const twr =
    input.subPeriodReturns != null
      ? timeWeightedReturn(input.subPeriodReturns)
      : input.navSeries
        ? twrFromNavSeries(input.navSeries, input.flowSeries || [])
        : abs;
  const irrVal =
    input.cashflows != null
      ? irr(input.cashflows)
      : irr([
          { amount: -opening, t: 0 },
          { amount: -flows, t: 0.5 },
          { amount: closing, t: 1 },
        ]);
  const days = Number(input.daysInPeriod || 365);
  const annualized = annualizeReturn(twr != null ? twr : abs, days);
  const bench = input.benchmarkReturn != null ? Number(input.benchmarkReturn) : null;
  const excess = excessReturn(twr != null ? twr : abs, bench);
  const vol = input.returns ? volatility(input.returns) : null;
  const dd = input.values ? maxDrawdown(input.values) : null;
  const sharpe = sharpeRatio(twr != null ? twr : abs, input.riskFreeRate, vol);

  return {
    absoluteReturn: abs,
    totalReturn: totalReturn(opening, closing, flows),
    incomeReturn: incomeReturn(opening, income),
    capitalReturn: capitalReturn(opening, closing, income, flows),
    twr,
    mwr,
    irr: irrVal,
    annualizedReturn: annualized,
    benchmarkReturn: bench,
    excessReturn: excess,
    volatility: vol,
    maxDrawdown: dd,
    sharpeRatio: sharpe,
    realizedGainLoss: Number(input.realizedGainLoss || 0),
    unrealizedGainLoss: Number(input.unrealizedGainLoss || 0),
  };
}

const BATCH_TRANSITIONS = {
  DRAFT: ['IMPORTED', 'VALIDATED', 'EXCEPTION'],
  IMPORTED: ['VALIDATED', 'EXCEPTION', 'DRAFT'],
  VALIDATED: ['APPROVED', 'EXCEPTION', 'DRAFT'],
  EXCEPTION: ['VALIDATED', 'DRAFT'],
  APPROVED: ['POSTED', 'REVERSED'],
  POSTED: ['LOCKED', 'REVERSED'],
  LOCKED: [],
  REVERSED: [],
};

function canTransitionBatch(from, to) {
  return (BATCH_TRANSITIONS[String(from).toUpperCase()] || []).includes(String(to).toUpperCase());
}

function validateImportRows(rows, opts = {}) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  (rows || []).forEach((row, idx) => {
    const key = `${row.instrumentId || row.instrumentCode}|${row.priceDate || ''}`;
    if (seen.has(key) && opts.preventDuplicates !== false) {
      errors.push({ row: idx, code: 'DUPLICATE', message: 'Duplicate instrument/date' });
    }
    seen.add(key);
    if (row.price == null && row.close == null) {
      errors.push({ row: idx, code: 'MISSING_PRICE', message: 'Price required' });
    }
    if (opts.lockedDates && opts.lockedDates.includes(row.priceDate)) {
      errors.push({ row: idx, code: 'LOCKED_PERIOD', message: 'Date is in locked period' });
    }
  });
  return { valid: errors.length === 0, errors, warnings };
}

module.exports = {
  round2,
  round6,
  round10,
  DEFAULT_SOURCE_PRIORITY,
  sourcePriority,
  selectBestPrice,
  pickPriceValue,
  daysBetween,
  priceChangePct,
  detectPriceExceptions,
  computeLineMarketValue,
  computeNAV,
  investorNAV,
  navMovement,
  absoluteReturn,
  moneyWeightedReturn,
  timeWeightedReturn,
  twrFromNavSeries,
  irr,
  annualizeReturn,
  excessReturn,
  volatility,
  maxDrawdown,
  sharpeRatio,
  capitalReturn,
  incomeReturn,
  totalReturn,
  computePerformancePeriod,
  canTransitionBatch,
  validateImportRows,
  BATCH_TRANSITIONS,
};
