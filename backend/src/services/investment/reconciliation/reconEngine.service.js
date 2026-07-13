'use strict';

/**
 * Pure reconciliation matching + period-close helpers (Phase 22).
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function round6(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1e6) / 1e6;
}

function absDiff(a, b) {
  return Math.abs(Number(a || 0) - Number(b || 0));
}

function withinTolerance(a, b, tol) {
  return absDiff(a, b) <= Number(tol || 0) + 1e-12;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const [ay, am, ad] = String(a).slice(0, 10).split('-').map(Number);
  const [by, bm, bd] = String(b).slice(0, 10).split('-').map(Number);
  return Math.abs(Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000));
}

/**
 * Score a candidate pair for matching (higher = better).
 */
function matchScore(source, internal, opts = {}) {
  let score = 0;
  const reasons = [];

  const srcRef = String(source.sourceReference || source.source_reference || '').trim().toUpperCase();
  const intRef = String(internal.internalReference || internal.internal_reference || internal.sourceReference || '').trim().toUpperCase();
  if (srcRef && intRef && srcRef === intRef) {
    score += 100;
    reasons.push('REFERENCE');
  }

  const srcInstr = Number(source.instrumentId || source.instrument_id || 0);
  const intInstr = Number(internal.instrumentId || internal.instrument_id || 0);
  if (srcInstr && intInstr && srcInstr === intInstr) {
    score += 40;
    reasons.push('INSTRUMENT');
  }

  const amtTol = Number(opts.amountTolerance != null ? opts.amountTolerance : 0.01);
  const qtyTol = Number(opts.quantityTolerance != null ? opts.quantityTolerance : 0.000001);
  const dateTol = Number(opts.dateToleranceDays != null ? opts.dateToleranceDays : 0);

  const srcAmt = source.actualAmount ?? source.actual_amount ?? source.amount;
  const intAmt = internal.expectedAmount ?? internal.expected_amount ?? internal.amount;
  if (srcAmt != null && intAmt != null) {
    if (withinTolerance(srcAmt, intAmt, amtTol)) {
      score += 50;
      reasons.push('AMOUNT_EXACT');
    } else if (withinTolerance(srcAmt, intAmt, amtTol * 10)) {
      score += 15;
      reasons.push('AMOUNT_NEAR');
    }
  }

  const srcQty = source.actualQuantity ?? source.actual_quantity ?? source.quantity;
  const intQty = internal.expectedQuantity ?? internal.expected_quantity ?? internal.quantity;
  if (srcQty != null && intQty != null) {
    if (withinTolerance(srcQty, intQty, qtyTol)) {
      score += 30;
      reasons.push('QUANTITY');
    }
  }

  const srcDate = source.lineDate || source.line_date || source.date;
  const intDate = internal.lineDate || internal.line_date || internal.date;
  if (srcDate && intDate) {
    const d = daysBetween(srcDate, intDate);
    if (d === 0) {
      score += 20;
      reasons.push('DATE_EXACT');
    } else if (d != null && d <= dateTol) {
      score += 10;
      reasons.push('DATE_TOL');
    }
  }

  return { score, reasons };
}

function classifyMatch(score, reasons) {
  if (score >= 150 || (reasons.includes('REFERENCE') && (reasons.includes('AMOUNT_EXACT') || reasons.includes('QUANTITY')))) {
    return { matchStatus: 'MATCHED', matchMethod: reasons.includes('REFERENCE') ? 'REFERENCE' : 'EXACT' };
  }
  if (score >= 80) {
    return { matchStatus: 'PARTIAL', matchMethod: 'TOLERANCE' };
  }
  if (score >= 40) {
    return { matchStatus: 'EXCEPTION', matchMethod: 'WEAK' };
  }
  return { matchStatus: 'UNMATCHED', matchMethod: null };
}

/**
 * Greedy 1:1 matching of source rows to internal rows.
 */
function runMatchingEngine(sourceRows, internalRows, opts = {}) {
  const sources = (sourceRows || []).map((r, i) => ({ ...r, _idx: i, _used: false }));
  const internals = (internalRows || []).map((r, i) => ({ ...r, _idx: i, _used: false }));
  const pairs = [];
  const minScore = Number(opts.minScore != null ? opts.minScore : 40);

  // Prefer reference matches first
  for (const s of sources) {
    if (s._used) continue;
    let best = null;
    for (const n of internals) {
      if (n._used) continue;
      const scored = matchScore(s, n, opts);
      if (scored.score < minScore) continue;
      if (!best || scored.score > best.scored.score) best = { internal: n, scored };
    }
    if (best) {
      s._used = true;
      best.internal._used = true;
      const cls = classifyMatch(best.scored.score, best.scored.reasons);
      const expectedAmount = best.internal.expectedAmount ?? best.internal.expected_amount ?? best.internal.amount ?? null;
      const actualAmount = s.actualAmount ?? s.actual_amount ?? s.amount ?? null;
      const expectedQuantity = best.internal.expectedQuantity ?? best.internal.expected_quantity ?? best.internal.quantity ?? null;
      const actualQuantity = s.actualQuantity ?? s.actual_quantity ?? s.quantity ?? null;
      pairs.push({
        source: s,
        internal: best.internal,
        ...cls,
        score: best.scored.score,
        reasons: best.scored.reasons,
        expectedAmount,
        actualAmount,
        expectedQuantity,
        actualQuantity,
        differenceAmount: round2(Number(actualAmount || 0) - Number(expectedAmount || 0)),
        differenceQuantity: round6(Number(actualQuantity || 0) - Number(expectedQuantity || 0)),
        sourceReference: s.sourceReference || s.source_reference || null,
        internalReference: best.internal.internalReference || best.internal.internal_reference || null,
        instrumentId: s.instrumentId || best.internal.instrumentId || null,
        lineDate: s.lineDate || best.internal.lineDate || null,
      });
    }
  }

  const unmatchedSource = sources.filter((s) => !s._used).map((s) => ({
    source: s,
    internal: null,
    matchStatus: 'UNMATCHED',
    matchMethod: null,
    score: 0,
    reasons: [],
    expectedAmount: null,
    actualAmount: s.actualAmount ?? s.actual_amount ?? s.amount ?? null,
    expectedQuantity: null,
    actualQuantity: s.actualQuantity ?? s.actual_quantity ?? s.quantity ?? null,
    differenceAmount: round2(Number(s.actualAmount ?? s.actual_amount ?? s.amount ?? 0)),
    differenceQuantity: round6(Number(s.actualQuantity ?? s.actual_quantity ?? s.quantity ?? 0)),
    sourceReference: s.sourceReference || s.source_reference || null,
    internalReference: null,
    instrumentId: s.instrumentId || null,
    lineDate: s.lineDate || null,
  }));

  const unmatchedInternal = internals.filter((n) => !n._used).map((n) => ({
    source: null,
    internal: n,
    matchStatus: 'UNMATCHED',
    matchMethod: null,
    score: 0,
    reasons: [],
    expectedAmount: n.expectedAmount ?? n.expected_amount ?? n.amount ?? null,
    actualAmount: null,
    expectedQuantity: n.expectedQuantity ?? n.expected_quantity ?? n.quantity ?? null,
    actualQuantity: null,
    differenceAmount: round2(-Number(n.expectedAmount ?? n.expected_amount ?? n.amount ?? 0)),
    differenceQuantity: round6(-Number(n.expectedQuantity ?? n.expected_quantity ?? n.quantity ?? 0)),
    sourceReference: null,
    internalReference: n.internalReference || n.internal_reference || null,
    instrumentId: n.instrumentId || null,
    lineDate: n.lineDate || null,
  }));

  const lines = [...pairs, ...unmatchedSource, ...unmatchedInternal];
  const summary = summarizeMatchLines(lines);
  return { lines, summary };
}

function summarizeMatchLines(lines) {
  const counts = { MATCHED: 0, PARTIAL: 0, UNMATCHED: 0, EXCEPTION: 0, RESOLVED: 0 };
  for (const l of lines || []) {
    const s = String(l.matchStatus || 'UNMATCHED').toUpperCase();
    counts[s] = (counts[s] || 0) + 1;
  }
  const total = (lines || []).length;
  return {
    totalRecords: total,
    matchedRecords: counts.MATCHED || 0,
    exceptionRecords: (counts.EXCEPTION || 0) + (counts.PARTIAL || 0),
    unmatchedRecords: counts.UNMATCHED || 0,
    resolvedRecords: counts.RESOLVED || 0,
    matchRate: total > 0 ? round2(((counts.MATCHED || 0) / total) * 100) : 0,
  };
}

function manualMatch(lineA, lineB, opts = {}) {
  const scored = matchScore(
    {
      sourceReference: lineA.sourceReference,
      instrumentId: lineA.instrumentId,
      actualAmount: lineA.actualAmount ?? lineA.expectedAmount,
      actualQuantity: lineA.actualQuantity ?? lineA.expectedQuantity,
      lineDate: lineA.lineDate,
    },
    {
      internalReference: lineB.internalReference || lineB.sourceReference,
      instrumentId: lineB.instrumentId,
      expectedAmount: lineB.expectedAmount ?? lineB.actualAmount,
      expectedQuantity: lineB.expectedQuantity ?? lineB.actualQuantity,
      lineDate: lineB.lineDate,
    },
    opts
  );
  return {
    matchStatus: 'MATCHED',
    matchMethod: 'MANUAL',
    score: Math.max(scored.score, 100),
    reasons: [...scored.reasons, 'MANUAL'],
  };
}

/** Many-to-one: sum sources vs one internal */
function manyToOneMatch(sources, internal, opts = {}) {
  const sumAmt = round2((sources || []).reduce((s, r) => s + Number(r.actualAmount ?? r.amount ?? 0), 0));
  const exp = Number(internal.expectedAmount ?? internal.amount ?? 0);
  const tol = Number(opts.amountTolerance != null ? opts.amountTolerance : 0.01);
  const ok = withinTolerance(sumAmt, exp, tol);
  return {
    matchStatus: ok ? 'MATCHED' : 'PARTIAL',
    matchMethod: 'MANY_TO_ONE',
    actualAmount: sumAmt,
    expectedAmount: exp,
    differenceAmount: round2(sumAmt - exp),
  };
}

function oneToManyMatch(source, internals, opts = {}) {
  const act = Number(source.actualAmount ?? source.amount ?? 0);
  const sumExp = round2((internals || []).reduce((s, r) => s + Number(r.expectedAmount ?? r.amount ?? 0), 0));
  const tol = Number(opts.amountTolerance != null ? opts.amountTolerance : 0.01);
  const ok = withinTolerance(act, sumExp, tol);
  return {
    matchStatus: ok ? 'MATCHED' : 'PARTIAL',
    matchMethod: 'ONE_TO_MANY',
    actualAmount: act,
    expectedAmount: sumExp,
    differenceAmount: round2(act - sumExp),
  };
}

const DEFAULT_CLOSE_CHECKLIST = [
  { key: 'trades_settled', label: 'All trades settled or explained', required: true },
  { key: 'income_accrued', label: 'All income accrued', required: true },
  { key: 'valuations_approved', label: 'All valuations approved', required: true },
  { key: 'no_stale_prices', label: 'No stale critical prices', required: true },
  { key: 'bank_recon', label: 'Bank reconciliation complete', required: true },
  { key: 'broker_recon', label: 'Broker reconciliation complete', required: true },
  { key: 'custodian_recon', label: 'Custodian reconciliation complete', required: true },
  { key: 'subledger_gl', label: 'Subledger-to-GL reconciled', required: true },
  { key: 'distributions_reviewed', label: 'Distributions reviewed', required: false },
  { key: 'partner_capital', label: 'Partner capital reconciled', required: true },
  { key: 'exceptions_approved', label: 'Exceptions approved', required: true },
  { key: 'period_lock', label: 'Period lock', required: false },
];

function buildChecklist(overrides = {}) {
  return DEFAULT_CLOSE_CHECKLIST.map((item) => ({
    ...item,
    done: !!overrides[item.key],
    completedAt: overrides[item.key] ? overrides[`${item.key}_at`] || null : null,
  }));
}

function checklistReady(checklist) {
  const items = checklist || [];
  const required = items.filter((i) => i.required);
  const doneRequired = required.filter((i) => i.done);
  return {
    ready: required.length > 0 && doneRequired.length === required.length,
    requiredCount: required.length,
    doneRequiredCount: doneRequired.length,
    totalDone: items.filter((i) => i.done).length,
    total: items.length,
  };
}

function canClosePeriod(status, checklist) {
  const st = String(status || 'OPEN').toUpperCase();
  if (!['OPEN', 'IN_PROGRESS', 'READY', 'REOPENED'].includes(st)) return false;
  // period_lock is applied by close itself — ignore for readiness
  const items = (checklist || []).map((i) =>
    i.key === 'period_lock' ? { ...i, required: false } : i
  );
  return checklistReady(items).ready;
}

function isPeriodLocked(closePeriod) {
  if (!closePeriod) return false;
  return String(closePeriod.status || '').toUpperCase() === 'CLOSED';
}

function assertPeriodOpen(closePeriod, action = 'post') {
  if (isPeriodLocked(closePeriod)) {
    const err = new Error(`Period is locked; cannot ${action}`);
    err.statusCode = 423;
    err.code = 'PERIOD_LOCKED';
    throw err;
  }
}

const BATCH_TRANSITIONS = {
  DRAFT: ['IMPORTED', 'MATCHING', 'CANCELLED'],
  IMPORTED: ['MATCHING', 'CANCELLED'],
  MATCHING: ['MATCHED', 'EXCEPTION', 'CANCELLED'],
  MATCHED: ['APPROVED', 'EXCEPTION', 'CLOSED'],
  EXCEPTION: ['MATCHING', 'APPROVED', 'CANCELLED'],
  APPROVED: ['CLOSED'],
  CLOSED: [],
  CANCELLED: [],
};

function canTransitionReconBatch(from, to) {
  return (BATCH_TRANSITIONS[String(from).toUpperCase()] || []).includes(String(to).toUpperCase());
}

const CLOSE_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'READY', 'CLOSED'],
  IN_PROGRESS: ['READY', 'OPEN', 'CLOSED'],
  READY: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['REOPENED'],
  REOPENED: ['IN_PROGRESS', 'READY', 'CLOSED'],
};

function canTransitionClose(from, to) {
  return (CLOSE_TRANSITIONS[String(from).toUpperCase()] || []).includes(String(to).toUpperCase());
}

module.exports = {
  round2,
  round6,
  absDiff,
  withinTolerance,
  daysBetween,
  matchScore,
  classifyMatch,
  runMatchingEngine,
  summarizeMatchLines,
  manualMatch,
  manyToOneMatch,
  oneToManyMatch,
  DEFAULT_CLOSE_CHECKLIST,
  buildChecklist,
  checklistReady,
  canClosePeriod,
  isPeriodLocked,
  assertPeriodOpen,
  canTransitionReconBatch,
  canTransitionClose,
  BATCH_TRANSITIONS,
  CLOSE_TRANSITIONS,
};
