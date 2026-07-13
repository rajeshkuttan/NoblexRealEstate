'use strict';

/**
 * Pure risk / compliance helpers (Phase 23).
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function round6(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1e6) / 1e6;
}

function parseJsonField(raw, fallback = null) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function asArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function upper(s) {
  return String(s || '').trim().toUpperCase();
}

/**
 * Aggregate holdings into exposure buckets.
 * holdings: [{ marketValue, assetClass, currencyCode, countryCode, sectorCode, issuerName, instrumentId }]
 */
function computeExposures(holdings = []) {
  const total = holdings.reduce((s, h) => s + Number(h.marketValue || h.currentMarketValue || 0), 0);
  const buckets = {
    assetClass: {},
    currency: {},
    country: {},
    sector: {},
    issuer: {},
    instrument: {},
  };

  for (const h of holdings) {
    const mv = Number(h.marketValue || h.currentMarketValue || 0);
    const add = (map, key) => {
      const k = upper(key) || 'UNKNOWN';
      map[k] = round2((map[k] || 0) + mv);
    };
    add(buckets.assetClass, h.assetClass);
    add(buckets.currency, h.currencyCode || h.currency);
    add(buckets.country, h.countryCode || h.country);
    add(buckets.sector, h.sectorCode || h.sector);
    add(buckets.issuer, h.issuerName || h.issuer);
    add(buckets.instrument, h.instrumentId || h.instrumentCode);
  }

  const toPct = (map) =>
    Object.entries(map)
      .map(([key, value]) => ({
        key,
        value: round2(value),
        pct: total > 0 ? round2((value / total) * 100) : 0,
      }))
      .sort((a, b) => b.value - a.value);

  return {
    totalMarketValue: round2(total),
    byAssetClass: toPct(buckets.assetClass),
    byCurrency: toPct(buckets.currency),
    byCountry: toPct(buckets.country),
    bySector: toPct(buckets.sector),
    byIssuer: toPct(buckets.issuer),
    byInstrument: toPct(buckets.instrument),
  };
}

function maturityBucket(maturityDate, asOf = new Date().toISOString().slice(0, 10)) {
  if (!maturityDate) return 'OPEN_ENDED';
  const [ay, am, ad] = String(asOf).slice(0, 10).split('-').map(Number);
  const [ey, em, ed] = String(maturityDate).slice(0, 10).split('-').map(Number);
  const days = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(ay, am - 1, ad)) / 86400000);
  if (days < 0) return 'MATURED';
  if (days <= 30) return '0_30';
  if (days <= 90) return '31_90';
  if (days <= 365) return '91_365';
  if (days <= 365 * 3) return '1Y_3Y';
  return '3Y_PLUS';
}

function liquidityProfile(holdings = [], asOf) {
  const map = {};
  let total = 0;
  for (const h of holdings) {
    const mv = Number(h.marketValue || h.currentMarketValue || 0);
    total += mv;
    let bucket = h.liquidityBucket;
    if (!bucket) {
      if (h.liquidityDays != null) {
        bucket = h.liquidityDays <= 7 ? 'T7' : h.liquidityDays <= 30 ? 'T30' : 'ILLIQUID';
      } else {
        bucket = maturityBucket(h.maturityDate, asOf);
      }
    }
    map[bucket] = round2((map[bucket] || 0) + mv);
  }
  return Object.entries(map).map(([key, value]) => ({
    key,
    value,
    pct: total > 0 ? round2((value / total) * 100) : 0,
  }));
}

function evaluateLimit(actualValue, limit) {
  const warning = Number(limit.thresholdWarning != null ? limit.thresholdWarning : limit.threshold_warning);
  const breach = Number(limit.thresholdBreach != null ? limit.thresholdBreach : limit.threshold_breach);
  const actual = Number(actualValue);
  const basis = String(limit.measurementBasis || limit.measurement_basis || 'PERCENT_NAV').toUpperCase();

  let severity = null;
  if (actual >= breach) severity = actual >= breach * 1.25 ? 'CRITICAL' : 'BREACH';
  else if (actual >= warning) severity = 'WARNING';

  return {
    breached: !!severity,
    severity,
    actualValue: round6(actual),
    limitValue: round6(breach),
    warningValue: round6(warning),
    measurementBasis: basis,
    dimension: limit.dimension || null,
    limitType: limit.limitType || limit.limit_type || null,
    withinTolerance: !severity,
  };
}

function evaluateLimitsAgainstExposures(limits = [], exposures = {}) {
  const results = [];
  for (const limit of limits) {
    if (String(limit.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') continue;
    const type = String(limit.limitType || limit.limit_type || '').toUpperCase();
    const dim = upper(limit.dimension);
    let series = [];
    if (type === 'ISSUER') series = exposures.byIssuer || [];
    else if (type === 'CURRENCY') series = exposures.byCurrency || [];
    else if (type === 'COUNTRY') series = exposures.byCountry || [];
    else if (type === 'SECTOR') series = exposures.bySector || [];
    else if (type === 'CONCENTRATION') series = exposures.byInstrument || [];
    else series = exposures.byAssetClass || [];

    const candidates = dim ? series.filter((x) => x.key === dim) : series;
    const pick = candidates.length
      ? candidates.reduce((a, b) => (a.pct >= b.pct ? a : b))
      : { key: dim || 'ALL', pct: 0, value: 0 };

    const basis = String(limit.measurementBasis || limit.measurement_basis || 'PERCENT_NAV').toUpperCase();
    const actual = basis === 'ABSOLUTE' ? pick.value : pick.pct;
    const evalResult = evaluateLimit(actual, limit);
    results.push({
      ...evalResult,
      dimensionKey: pick.key,
      limitId: limit.id || null,
    });
  }
  return results;
}

function mandateAllowsAssetClass(mandate, assetClass) {
  if (!mandate) return { ok: true };
  const allowed = asArray(parseJsonField(mandate.allowedAssetClassesJson || mandate.allowed_asset_classes_json, []));
  const prohibited = asArray(
    parseJsonField(mandate.prohibitedAssetClassesJson || mandate.prohibited_asset_classes_json, [])
  );
  const ac = upper(assetClass);
  if (prohibited.map(upper).includes(ac)) {
    return { ok: false, code: 'PROHIBITED_ASSET_CLASS', message: `Asset class ${ac} is prohibited` };
  }
  if (allowed.length && !allowed.map(upper).includes(ac)) {
    return { ok: false, code: 'NOT_IN_MANDATE', message: `Asset class ${ac} not in mandate` };
  }
  return { ok: true };
}

function isMandateEffective(mandate, asOf = new Date().toISOString().slice(0, 10)) {
  if (!mandate) return false;
  if (String(mandate.status || '').toUpperCase() !== 'ACTIVE') return false;
  const from = String(mandate.effectiveFrom || mandate.effective_from || '').slice(0, 10);
  const to = mandate.effectiveTo || mandate.effective_to;
  if (from && asOf < from) return false;
  if (to && asOf > String(to).slice(0, 10)) return false;
  return true;
}

const KYC_BLOCKING = new Set(['PENDING', 'EXPIRED', 'REJECTED', 'FAILED', 'FAIL']);

function investorAllocationAllowed(investor, opts = {}) {
  if (!investor) return { ok: false, code: 'NO_INVESTOR', message: 'Investor required' };
  const kyc = upper(investor.kycStatus || investor.kyc_status);
  const approval = upper(investor.complianceApprovalStatus || investor.compliance_approval_status || 'PENDING');
  const status = upper(investor.status || 'ACTIVE');

  if (status !== 'ACTIVE') {
    return { ok: false, code: 'INVESTOR_INACTIVE', message: 'Investor is not ACTIVE' };
  }
  if (KYC_BLOCKING.has(kyc)) {
    return { ok: false, code: 'KYC_BLOCKED', message: `KYC status ${kyc} blocks allocations` };
  }
  if ((approval === 'REJECTED' || approval === 'PENDING') && !opts.allowPendingApproval) {
    return { ok: false, code: 'COMPLIANCE_APPROVAL', message: `Compliance approval is ${approval}` };
  }
  const expiry = investor.kycExpiryDate || investor.kyc_expiry_date;
  if (expiry && String(expiry).slice(0, 10) < (opts.asOf || new Date().toISOString().slice(0, 10))) {
    return { ok: false, code: 'KYC_EXPIRED', message: 'KYC expired' };
  }
  return { ok: true };
}

function runPreTradeChecks(ctx = {}) {
  const checks = [];
  const fail = (code, message, severity = 'BREACH') => {
    checks.push({ code, message, status: 'FAIL', severity });
  };
  const pass = (code, message) => {
    checks.push({ code, message, status: 'PASS', severity: null });
  };

  const order = ctx.order || {};
  const instrument = ctx.instrument || {};
  const asOf = ctx.asOf || order.orderDate || new Date().toISOString().slice(0, 10);

  if (ctx.mandate) {
    if (!isMandateEffective(ctx.mandate, asOf)) {
      fail('MANDATE_INACTIVE', 'No active mandate for trade date');
    } else {
      const m = mandateAllowsAssetClass(ctx.mandate, instrument.assetClass || order.assetClass);
      if (!m.ok) fail(m.code, m.message);
      else pass('MANDATE', 'Mandate allows asset class');
    }
  } else if (ctx.requireMandate) {
    fail('MANDATE_MISSING', 'Portfolio mandate required');
  } else {
    pass('MANDATE', 'No mandate configured');
  }

  if (instrument.isRestricted || instrument.is_restricted || ctx.restricted) {
    fail('RESTRICTED_INSTRUMENT', 'Instrument is restricted');
  } else {
    pass('RESTRICTED_INSTRUMENT', 'Instrument not restricted');
  }

  const tradeNotional =
    Number(order.estimatedNotional || order.notional || 0) ||
    Number(order.quantity || 0) * Number(order.limitPrice || order.price || 1);

  if (ctx.limits && ctx.exposures) {
    const total = Number(ctx.exposures.totalMarketValue || 0) + Math.abs(tradeNotional);
    const instrKey = upper(instrument.id || order.instrumentId || 'NEW');
    const existing = (ctx.exposures.byInstrument || []).find((x) => x.key === instrKey);
    const newVal = (existing ? existing.value : 0) + Math.abs(tradeNotional);
    const projectedPct = total > 0 ? (newVal / total) * 100 : 0;
    let limitFailed = false;
    for (const limit of ctx.limits) {
      if (String(limit.limitType || limit.limit_type).toUpperCase() !== 'CONCENTRATION') continue;
      const ev = evaluateLimit(projectedPct, limit);
      if (ev.breached && ev.severity !== 'WARNING') {
        fail('PORTFOLIO_LIMIT', `Concentration limit breached (${round2(projectedPct)}%)`, ev.severity);
        limitFailed = true;
      }
    }
    if (!limitFailed) pass('PORTFOLIO_LIMIT', 'Within concentration limits');
  } else {
    pass('PORTFOLIO_LIMIT', 'No limits to evaluate');
  }

  if (ctx.blockedCounterparties && order.brokerId) {
    if (ctx.blockedCounterparties.map(Number).includes(Number(order.brokerId))) {
      fail('COUNTERPARTY', 'Broker/counterparty blocked');
    } else pass('COUNTERPARTY', 'Counterparty allowed');
  } else {
    pass('COUNTERPARTY', 'Counterparty check skipped');
  }

  if (ctx.cashAvailable != null && String(order.side || order.orderSide || 'BUY').toUpperCase() === 'BUY') {
    if (Math.abs(tradeNotional) > Number(ctx.cashAvailable) + 1e-6) {
      fail('AVAILABLE_CASH', 'Insufficient available cash');
    } else pass('AVAILABLE_CASH', 'Cash sufficient');
  } else {
    pass('AVAILABLE_CASH', 'Cash check skipped');
  }

  if (ctx.investor) {
    const inv = investorAllocationAllowed(ctx.investor, { asOf });
    if (!inv.ok) fail(inv.code, inv.message);
    else pass('INVESTOR', 'Investor compliance OK');
  } else {
    pass('INVESTOR', 'No investor on order');
  }

  if (ctx.relatedPartyNeedsApproval && !ctx.relatedPartyApproved) {
    fail('RELATED_PARTY', 'Related-party approval required');
  } else {
    pass('RELATED_PARTY', 'Related-party OK');
  }

  const failed = checks.filter((c) => c.status === 'FAIL');
  return {
    passed: failed.length === 0,
    checks,
    failures: failed,
    blockingCount: failed.length,
  };
}

function canOverrideBreach(fromStatus, toStatus) {
  const allowed = {
    OPEN: ['UNDER_REVIEW', 'EXCEPTION_APPROVED', 'REMEDIATED', 'CLOSED'],
    UNDER_REVIEW: ['EXCEPTION_APPROVED', 'REMEDIATED', 'CLOSED', 'OPEN'],
    EXCEPTION_APPROVED: ['REMEDIATED', 'CLOSED'],
    REMEDIATED: ['CLOSED'],
    CLOSED: [],
  };
  return (allowed[String(fromStatus).toUpperCase()] || []).includes(String(toStatus).toUpperCase());
}

function assertOverrideReason(reason) {
  if (!reason || !String(reason).trim()) {
    const err = new Error('Override requires a reason');
    err.statusCode = 400;
    err.code = 'OVERRIDE_REASON_REQUIRED';
    throw err;
  }
}

function kycExpiringSoon(investor, withinDays = 30, asOf = new Date().toISOString().slice(0, 10)) {
  const expiry = investor.kycExpiryDate || investor.kyc_expiry_date;
  if (!expiry) return false;
  const [ay, am, ad] = asOf.split('-').map(Number);
  const [ey, em, ed] = String(expiry).slice(0, 10).split('-').map(Number);
  const days = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(ay, am - 1, ad)) / 86400000);
  return days >= 0 && days <= withinDays;
}

function complianceCheckExpired(check, asOf = new Date().toISOString().slice(0, 10)) {
  const exp = check.expiryDate || check.expiry_date;
  if (!exp) return false;
  return String(exp).slice(0, 10) < asOf;
}

function summarizeRiskDashboard({ exposures, breaches = [], kycExpiries = [], staleValuations = [], liquidity = [] }) {
  return {
    concentrations: {
      assetClass: (exposures && exposures.byAssetClass) || [],
      issuer: (exposures && exposures.byIssuer) || [],
      currency: (exposures && exposures.byCurrency) || [],
      country: (exposures && exposures.byCountry) || [],
      sector: (exposures && exposures.bySector) || [],
    },
    liquidityProfile: liquidity,
    openBreaches: breaches.filter((b) => ['OPEN', 'UNDER_REVIEW'].includes(String(b.status).toUpperCase())),
    breachCount: breaches.length,
    kycExpiries,
    staleValuations,
    totalMarketValue: exposures ? exposures.totalMarketValue : 0,
  };
}

const MANDATE_TRANSITIONS = {
  DRAFT: ['ACTIVE', 'SUSPENDED'],
  ACTIVE: ['SUSPENDED', 'EXPIRED'],
  SUSPENDED: ['ACTIVE', 'EXPIRED'],
  EXPIRED: [],
};

function canTransitionMandate(from, to) {
  return (MANDATE_TRANSITIONS[String(from).toUpperCase()] || []).includes(String(to).toUpperCase());
}

module.exports = {
  round2,
  round6,
  parseJsonField,
  asArray,
  computeExposures,
  maturityBucket,
  liquidityProfile,
  evaluateLimit,
  evaluateLimitsAgainstExposures,
  mandateAllowsAssetClass,
  isMandateEffective,
  investorAllocationAllowed,
  runPreTradeChecks,
  canOverrideBreach,
  assertOverrideReason,
  kycExpiringSoon,
  complianceCheckExpired,
  summarizeRiskDashboard,
  canTransitionMandate,
  MANDATE_TRANSITIONS,
  KYC_BLOCKING,
};
