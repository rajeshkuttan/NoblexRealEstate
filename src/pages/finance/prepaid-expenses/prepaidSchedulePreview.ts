export type SchedulePreviewLine = {
  lineNumber: number;
  periodStart: string;
  periodEnd: string;
  serviceDays: number;
  recognitionMonth: string;
  dailyRate: string;
  scheduledAmount: string;
  cumulativeRecognizedAmount: string;
  remainingBalanceAfterLine: string;
  isFinalAdjustment: boolean;
  recognitionDate: string;
  dueDate: string;
};

const MS_PER_DAY = 86400000;

function parseDateOnly(dateStr: string): number {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid date: ${dateStr}`);
  }
  return Date.UTC(parts[0], parts[1] - 1, parts[2]);
}

function formatDateOnly(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function lastDayOfMonthMs(year: number, monthIndex: number): number {
  return Date.UTC(year, monthIndex + 1, 0);
}

export function calculateInclusiveDays(startDate: string, endDate: string): number {
  const startMs = parseDateOnly(startDate);
  const endMs = parseDateOnly(endDate);
  if (endMs < startMs) {
    throw new Error("End date must be on or after start date");
  }
  return Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
}

function amountToCents(amount: string | number): number {
  const n = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/,/g, ""));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function centsToAmount(cents: number, precision = 2): string {
  return (cents / 100).toFixed(precision);
}

export function calculateDailyRate(amount: string | number, totalDays: number): string {
  if (!totalDays || totalDays <= 0) return "0.000000";
  const cents = amountToCents(amount);
  return (cents / totalDays / 100).toFixed(6);
}

function splitIntoCalendarMonths(startDate: string, endDate: string) {
  const startMs = parseDateOnly(startDate);
  const endMs = parseDateOnly(endDate);
  const periods: Array<{
    periodStart: string;
    periodEnd: string;
    serviceDays: number;
    recognitionMonth: string;
  }> = [];
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
    const recognitionMonth = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    periods.push({ periodStart, periodEnd, serviceDays, recognitionMonth });
    cursorMs = Date.UTC(year, monthIndex + 1, 1);
  }

  return periods;
}

function roundHalfUp(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor + Number.EPSILON) / factor;
}

export function calculateMonthlySchedulePreview(
  amount: string | number,
  startDate: string,
  endDate: string,
  currencyPrecision = 2
): SchedulePreviewLine[] {
  if (!startDate || !endDate || !amount) return [];

  try {
    const totalDays = calculateInclusiveDays(startDate, endDate);
    const totalCents = amountToCents(amount);
    const dailyRateCents = totalCents / totalDays;
    const dailyRate = (dailyRateCents / 100).toFixed(6);
    const periods = splitIntoCalendarMonths(startDate, endDate);
    if (!periods.length) return [];

    const schedule: SchedulePreviewLine[] = periods.map((period, idx) => {
      const rawCents = Math.round(period.serviceDays * dailyRateCents);
      return {
        lineNumber: idx + 1,
        ...period,
        dailyRate,
        scheduledAmount: centsToAmount(rawCents, currencyPrecision),
        cumulativeRecognizedAmount: "0.00",
        remainingBalanceAfterLine: "0.00",
        isFinalAdjustment: false,
        recognitionDate: period.periodEnd,
        dueDate: period.periodEnd,
      };
    });

    let sumExceptLast = 0;
    for (let i = 0; i < schedule.length - 1; i += 1) {
      sumExceptLast += amountToCents(schedule[i].scheduledAmount);
    }
    const lastIdx = schedule.length - 1;
    const adjustedLastCents = totalCents - sumExceptLast;
    const rawLastCents = amountToCents(schedule[lastIdx].scheduledAmount);
    schedule[lastIdx] = {
      ...schedule[lastIdx],
      scheduledAmount: centsToAmount(adjustedLastCents, currencyPrecision),
      isFinalAdjustment: adjustedLastCents !== rawLastCents,
    };

    let runningCents = 0;
    for (const line of schedule) {
      runningCents += amountToCents(line.scheduledAmount);
      line.cumulativeRecognizedAmount = centsToAmount(runningCents, currencyPrecision);
      line.remainingBalanceAfterLine = centsToAmount(totalCents - runningCents, currencyPrecision);
    }

    return schedule;
  } catch {
    return [];
  }
}

export function previewScheduleSummary(lines: SchedulePreviewLine[]) {
  const total = lines.reduce((s, l) => s + amountToCents(l.scheduledAmount), 0);
  const days = lines.reduce((s, l) => s + l.serviceDays, 0);
  return {
    lineCount: lines.length,
    totalAmount: centsToAmount(total),
    totalDays: days,
  };
}
