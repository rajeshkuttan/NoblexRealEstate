'use strict';

/**
 * Pure helpers for Phase 19 income accruals, schedules, and corporate actions.
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function round6(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1e6) / 1e6;
}

function parseDate(d) {
  if (!d) return null;
  const s = String(d).slice(0, 10);
  const [y, m, day] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function formatDate(dt) {
  if (!dt) return null;
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function daysBetween(start, end) {
  const a = parseDate(start);
  const b = parseDate(end);
  if (!a || !b) return 0;
  return Math.max(0, Math.round((b - a) / 86400000));
}

function addDays(dateStr, days) {
  const dt = parseDate(dateStr);
  if (!dt) return null;
  dt.setUTCDate(dt.getUTCDate() + Number(days));
  return formatDate(dt);
}

function addMonths(dateStr, months) {
  const dt = parseDate(dateStr);
  if (!dt) return null;
  const day = dt.getUTCDate();
  dt.setUTCMonth(dt.getUTCMonth() + Number(months));
  // Clamp end-of-month overflow
  if (dt.getUTCDate() < day) dt.setUTCDate(0);
  return formatDate(dt);
}

/** Actual/365 accrual fraction */
function accrualFraction(accrualStart, accrualEnd, asOfDate) {
  const total = daysBetween(accrualStart, accrualEnd);
  if (total <= 0) return 0;
  const end = asOfDate && String(asOfDate) < String(accrualEnd) ? asOfDate : accrualEnd;
  if (String(end) <= String(accrualStart)) return 0;
  return Math.min(1, daysBetween(accrualStart, end) / total);
}

function computeAccruedAmount(grossAmount, accrualStart, accrualEnd, asOfDate) {
  const frac = accrualFraction(accrualStart, accrualEnd, asOfDate);
  return round2(Number(grossAmount || 0) * frac);
}

function computeNetIncome(grossAmount, withholdingTax = 0) {
  return round2(Number(grossAmount || 0) - Number(withholdingTax || 0));
}

function couponGross({ faceValue, quantity, couponRate, periodFraction = 0.5 }) {
  // couponRate as annual percent e.g. 5 = 5%
  const notional = Number(faceValue || 0) * Number(quantity || 0);
  return round2(notional * (Number(couponRate || 0) / 100) * Number(periodFraction));
}

function interestGross({ principal, annualRate, days, dayCount = 365 }) {
  return round2(Number(principal || 0) * (Number(annualRate || 0) / 100) * (Number(days) / Number(dayCount)));
}

function dividendGross({ quantity, perUnit }) {
  return round2(Number(quantity || 0) * Number(perUnit || 0));
}

/**
 * Generate coupon/interest payment schedule dates between start and maturity.
 * frequency: ANNUAL | SEMI_ANNUAL | QUARTERLY | MONTHLY
 */
function generatePaymentDates(startDate, maturityDate, frequency = 'SEMI_ANNUAL') {
  const months =
    {
      ANNUAL: 12,
      SEMI_ANNUAL: 6,
      QUARTERLY: 3,
      MONTHLY: 1,
    }[String(frequency).toUpperCase()] || 6;

  const dates = [];
  if (!startDate || !maturityDate) return dates;
  let cursor = startDate;
  // First period ends after `months` from start (or use start as first accrual start)
  let pay = addMonths(startDate, months);
  const mat = String(maturityDate);
  let guard = 0;
  while (pay && String(pay) <= mat && guard < 500) {
    dates.push({ accrualStart: cursor, accrualEnd: pay, paymentDate: pay });
    cursor = pay;
    pay = addMonths(pay, months);
    guard += 1;
  }
  if (dates.length === 0 || (dates[dates.length - 1].paymentDate !== mat && String(cursor) < mat)) {
    dates.push({ accrualStart: cursor, accrualEnd: mat, paymentDate: mat });
  }
  return dates;
}

function incomeTypeForInstrument(instrumentType, assetClass) {
  const key = String(instrumentType || assetClass || '')
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (['FIXED_DEPOSIT', 'FD', 'CASH', 'MONEY_MARKET'].includes(key)) return 'INTEREST';
  if (['SUKUK', 'FIXED_INCOME', 'BOND', 'BONDS'].includes(key)) return 'COUPON';
  if (['FUND', 'MUTUAL_FUND', 'ETF'].includes(key)) return 'FUND_DISTRIBUTION';
  if (['REAL_ESTATE_FUND', 'PROPERTY'].includes(key)) return 'RENTAL_DISTRIBUTION';
  if (['PRIVATE_EQUITY', 'PE'].includes(key)) return 'PROFIT_DISTRIBUTION';
  return 'DIVIDEND';
}

const INCOME_TRANSITIONS = {
  EXPECTED: ['ACCRUED', 'RECEIVABLE', 'CANCELLED'],
  ACCRUED: ['RECEIVABLE', 'RECEIVED', 'CANCELLED'],
  RECEIVABLE: ['RECEIVED', 'CANCELLED'],
  RECEIVED: ['RECONCILED', 'DISTRIBUTED', 'REINVESTED'],
  RECONCILED: ['DISTRIBUTED', 'REINVESTED'],
  DISTRIBUTED: [],
  REINVESTED: [],
  CANCELLED: [],
};

function canTransitionIncome(from, to) {
  return (INCOME_TRANSITIONS[String(from).toUpperCase()] || []).includes(String(to).toUpperCase());
}

const CA_TRANSITIONS = {
  ANNOUNCED: ['ENTITLED', 'CANCELLED'],
  ENTITLED: ['ELECTED', 'APPLIED', 'CANCELLED'],
  ELECTED: ['APPLIED', 'CANCELLED'],
  APPLIED: ['SETTLED'],
  SETTLED: [],
  CANCELLED: [],
};

function canTransitionCorporateAction(from, to) {
  return (CA_TRANSITIONS[String(from).toUpperCase()] || []).includes(String(to).toUpperCase());
}

/**
 * Compute entitlement from eligible quantity and action ratio/cash.
 * ratio: new/old = numerator/denominator (e.g. 2-for-1 split => num=2 den=1)
 */
function computeEntitlement({
  actionType,
  eligibleQuantity,
  ratioNumerator = 1,
  ratioDenominator = 1,
  cashComponent = 0,
  stockComponent = 0,
}) {
  const qty = Number(eligibleQuantity || 0);
  const num = Number(ratioNumerator || 1);
  const den = Number(ratioDenominator || 1) || 1;
  const type = String(actionType || '').toUpperCase();

  let entitlementQuantity = 0;
  let entitlementCash = 0;
  let resultingQuantity = qty;

  switch (type) {
    case 'STOCK_SPLIT':
      entitlementQuantity = round6(qty * (num / den) - qty);
      resultingQuantity = round6(qty * (num / den));
      break;
    case 'REVERSE_SPLIT':
      entitlementQuantity = round6(qty * (num / den) - qty);
      resultingQuantity = round6(qty * (num / den));
      break;
    case 'BONUS_ISSUE':
    case 'STOCK_DIVIDEND':
      // e.g. 1 bonus for every 10 held => num=1 den=10
      entitlementQuantity = round6(qty * (num / den));
      resultingQuantity = round6(qty + entitlementQuantity);
      break;
    case 'CASH_DIVIDEND':
    case 'CAPITAL_REPAYMENT':
    case 'REDEMPTION':
    case 'TENDER_OFFER':
    case 'MATURITY':
    case 'CALL':
    case 'PUT':
      entitlementCash = round2(qty * Number(cashComponent || 0));
      resultingQuantity = type === 'REDEMPTION' || type === 'MATURITY' || type === 'CALL' ? 0 : qty;
      if (type === 'TENDER_OFFER' && stockComponent) {
        entitlementQuantity = round6(Number(stockComponent));
      }
      break;
    case 'RIGHTS_ISSUE':
      entitlementQuantity = round6(qty * (num / den));
      resultingQuantity = qty; // rights are elective; holding unchanged until exercised
      break;
    case 'MERGER':
    case 'SPIN_OFF':
    case 'CONVERSION':
      entitlementQuantity = round6(qty * (num / den));
      resultingQuantity = round6(qty * (num / den));
      break;
    default:
      entitlementQuantity = round6(Number(stockComponent || 0));
      entitlementCash = round2(qty * Number(cashComponent || 0));
  }

  return {
    eligibleQuantity: qty,
    entitlementQuantity,
    entitlementCash,
    resultingQuantity,
  };
}

function reconcileIncome({ expectedNet, receivedNet, bankReceipt, glIncome }) {
  const e = Number(expectedNet || 0);
  const r = Number(receivedNet || 0);
  const b = Number(bankReceipt || 0);
  const g = Number(glIncome || 0);
  const diffs = {
    expectedVsReceived: round2(e - r),
    receivedVsBank: round2(r - b),
    receivedVsGl: round2(r - g),
    expectedVsGl: round2(e - g),
  };
  const matched =
    Math.abs(diffs.expectedVsReceived) < 0.01 &&
    Math.abs(diffs.receivedVsBank) < 0.01 &&
    Math.abs(diffs.receivedVsGl) < 0.01;
  return { matched, diffs, expectedNet: e, receivedNet: r, bankReceipt: b, glIncome: g };
}

function previewIncomeJournal(event) {
  const status = String(event.status || '').toUpperCase();
  const gross = Number(event.grossAmount || event.gross_amount || 0);
  const accrued = Number(event.accruedAmount || event.accrued_amount || 0);
  const wht = Number(event.withholdingTax || event.withholding_tax || 0);
  const net = Number(event.netAmount || event.net_amount || 0);
  const lines = [];

  if (status === 'ACCRUED' || status === 'EXPECTED') {
    const amt = accrued || gross;
    lines.push({ account: 'Accrued income receivable', debit: amt, credit: 0 });
    lines.push({ account: 'Investment income', debit: 0, credit: amt });
  } else if (status === 'RECEIVABLE') {
    lines.push({ account: 'Income receivable', debit: net + wht, credit: 0 });
    if (wht > 0) lines.push({ account: 'Withholding tax', debit: 0, credit: wht });
    lines.push({ account: 'Investment income', debit: 0, credit: net + wht });
  } else if (['RECEIVED', 'RECONCILED'].includes(status)) {
    lines.push({ account: 'Cash / Bank', debit: net, credit: 0 });
    if (wht > 0) lines.push({ account: 'Withholding tax receivable', debit: wht, credit: 0 });
    lines.push({ account: 'Income receivable', debit: 0, credit: net + wht });
  } else if (status === 'REINVESTED') {
    lines.push({ account: 'Investment asset', debit: net, credit: 0 });
    lines.push({ account: 'Income receivable', debit: 0, credit: net });
  }

  return { status, lines };
}

module.exports = {
  round2,
  round6,
  parseDate,
  formatDate,
  daysBetween,
  addDays,
  addMonths,
  accrualFraction,
  computeAccruedAmount,
  computeNetIncome,
  couponGross,
  interestGross,
  dividendGross,
  generatePaymentDates,
  incomeTypeForInstrument,
  canTransitionIncome,
  canTransitionCorporateAction,
  computeEntitlement,
  reconcileIncome,
  previewIncomeJournal,
  INCOME_TRANSITIONS,
  CA_TRANSITIONS,
};
