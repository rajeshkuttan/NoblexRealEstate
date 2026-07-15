'use strict';

const Decimal = require('decimal.js');

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

const MS_PER_DAY = 86400000;

function parseDateOnly(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Date must be YYYY-MM-DD string');
  }
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

function formatDateOnly(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function lastDayOfMonthMs(year, monthIndex) {
  return Date.UTC(year, monthIndex + 1, 0);
}

/**
 * Inclusive day count between UTC date-only strings.
 */
function calculateInclusiveDays(startDate, endDate) {
  const startMs = parseDateOnly(startDate);
  const endMs = parseDateOnly(endDate);
  if (endMs < startMs) {
    throw new Error('End date must be on or after start date');
  }
  return Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
}

/**
 * Daily rate as DECIMAL string (18,6 scale).
 */
function calculateDailyRate(amount, totalDays) {
  const days = Number(totalDays);
  if (!days || days <= 0) {
    throw new Error('Total days must be positive');
  }
  return new Decimal(amount).div(days).toFixed(6);
}

/**
 * Split service period into calendar-month recognition buckets.
 */
function splitIntoCalendarMonths(startDate, endDate) {
  const startMs = parseDateOnly(startDate);
  const endMs = parseDateOnly(endDate);
  if (endMs < startMs) {
    throw new Error('End date must be on or after start date');
  }

  const periods = [];
  let cursorMs = startMs;

  while (cursorMs <= endMs) {
    const cursor = new Date(cursorMs);
    const year = cursor.getUTCFullYear();
    const monthIndex = cursor.getUTCMonth();
    const monthStartMs = Date.UTC(year, monthIndex, 1);
    const monthEndMs = lastDayOfMonthMs(year, monthIndex);

    const periodStartMs = Math.max(cursorMs, monthStartMs);
    const periodEndMs = Math.min(endMs, monthEndMs);
    const periodStart = formatDateOnly(periodStartMs);
    const periodEnd = formatDateOnly(periodEndMs);
    const serviceDays = calculateInclusiveDays(periodStart, periodEnd);
    const recognitionMonth = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    periods.push({ periodStart, periodEnd, serviceDays, recognitionMonth });

    cursorMs = Date.UTC(year, monthIndex + 1, 1);
  }

  return periods;
}

function roundAmount(value, currencyPrecision) {
  return new Decimal(value).toDecimalPlaces(currencyPrecision, Decimal.ROUND_HALF_UP);
}

/**
 * Apply residual rounding to the final schedule line so totals match exactly.
 */
function applyFinalRoundingAdjustment(schedule, totalAmount, currencyPrecision = 2) {
  if (!schedule || !schedule.length) return schedule;

  const total = new Decimal(totalAmount);
  let sumExceptLast = new Decimal(0);
  for (let i = 0; i < schedule.length - 1; i += 1) {
    sumExceptLast = sumExceptLast.plus(schedule[i].scheduledAmount || 0);
  }

  const lastIdx = schedule.length - 1;
  const rawLast = roundAmount(schedule[lastIdx].scheduledAmount || 0, currencyPrecision);
  const adjustedLast = total.minus(sumExceptLast).toDecimalPlaces(currencyPrecision, Decimal.ROUND_HALF_UP);
  const adjustedStr = adjustedLast.toFixed(currencyPrecision);

  schedule[lastIdx] = {
    ...schedule[lastIdx],
    scheduledAmount: adjustedStr,
    isFinalAdjustment: !adjustedLast.equals(rawLast),
  };

  return schedule;
}

function validateScheduleTotals(schedule, totalAmount, currencyPrecision = 2) {
  if (!schedule || !schedule.length) {
    return { valid: false, sum: '0.00', difference: totalAmount };
  }
  let sum = new Decimal(0);
  let days = 0;
  for (const line of schedule) {
    sum = sum.plus(line.scheduledAmount || 0);
    days += line.serviceDays || 0;
  }
  const target = roundAmount(totalAmount, currencyPrecision);
  const diff = sum.minus(target).abs();
  return {
    valid: diff.lte(new Decimal(10).pow(-currencyPrecision)),
    sum: sum.toFixed(currencyPrecision),
    totalDays: days,
    difference: diff.toFixed(currencyPrecision),
  };
}

/**
 * Primary daily pro-rata calendar-month schedule.
 */
function calculateMonthlySchedule(amount, startDate, endDate, currencyPrecision = 2) {
  const totalDays = calculateInclusiveDays(startDate, endDate);
  const dailyRate = calculateDailyRate(amount, totalDays);
  const periods = splitIntoCalendarMonths(startDate, endDate);
  const total = new Decimal(amount);

  let cumulative = new Decimal(0);
  const schedule = periods.map((period, idx) => {
    const rawAmount = roundAmount(new Decimal(period.serviceDays).times(dailyRate), currencyPrecision);
    cumulative = cumulative.plus(rawAmount);
    const remaining = total.minus(cumulative);

    return {
      lineNumber: idx + 1,
      ...period,
      dailyRate,
      scheduledAmount: rawAmount.toFixed(currencyPrecision),
      cumulativeRecognizedAmount: cumulative.toFixed(currencyPrecision),
      remainingBalanceAfterLine: remaining.toFixed(currencyPrecision),
      isFinalAdjustment: false,
      recognitionDate: period.periodEnd,
      dueDate: period.periodEnd,
    };
  });

  applyFinalRoundingAdjustment(schedule, amount, currencyPrecision);

  let running = new Decimal(0);
  for (const line of schedule) {
    running = running.plus(line.scheduledAmount);
    line.cumulativeRecognizedAmount = running.toFixed(currencyPrecision);
    line.remainingBalanceAfterLine = total.minus(running).toFixed(currencyPrecision);
  }

  return schedule;
}

/**
 * Secondary equal-monthly split (ignores day weights).
 */
function equalMonthlySchedule(amount, startDate, endDate, currencyPrecision = 2) {
  const periods = splitIntoCalendarMonths(startDate, endDate);
  if (!periods.length) return [];

  const perMonth = roundAmount(new Decimal(amount).div(periods.length), currencyPrecision);
  const schedule = periods.map((period, idx) => ({
    lineNumber: idx + 1,
    ...period,
    dailyRate: calculateDailyRate(amount, calculateInclusiveDays(startDate, endDate)),
    scheduledAmount: perMonth.toFixed(currencyPrecision),
    isFinalAdjustment: false,
    recognitionDate: period.periodEnd,
    dueDate: period.periodEnd,
  }));

  return applyFinalRoundingAdjustment(schedule, amount, currencyPrecision);
}

/**
 * Recalculate remaining schedule from a future date (unposted tail).
 */
function calculateRemainingSchedule(amount, startDate, endDate, currencyPrecision = 2) {
  return calculateMonthlySchedule(amount, startDate, endDate, currencyPrecision);
}

module.exports = {
  parseDateOnly,
  formatDateOnly,
  calculateInclusiveDays,
  calculateDailyRate,
  splitIntoCalendarMonths,
  calculateMonthlySchedule,
  equalMonthlySchedule,
  applyFinalRoundingAdjustment,
  validateScheduleTotals,
  calculateRemainingSchedule,
  roundAmount,
};
