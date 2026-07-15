'use strict';

const Decimal = require('decimal.js');
const calc = require('../../services/leaseRevenue/leaseRevenueCalculation.service');

const FIXTURE = {
  amount: '120000',
  start: '2026-01-15',
  end: '2027-01-14',
  precision: 2,
};

function sumAmounts(schedule) {
  return schedule
    .reduce((s, l) => s.plus(l.scheduledAmount || 0), new Decimal(0))
    .toDecimalPlaces(2)
    .toNumber();
}

function sumDays(schedule) {
  return schedule.reduce((s, l) => s + l.serviceDays, 0);
}

describe('leaseRevenueCalculation.service — mandatory 120k fixture', () => {
  test('total inclusive days = 365', () => {
    expect(calc.calculateInclusiveDays(FIXTURE.start, FIXTURE.end)).toBe(365);
  });

  test('schedule has 13 lines', () => {
    const schedule = calc.calculateMonthlySchedule(FIXTURE.amount, FIXTURE.start, FIXTURE.end, FIXTURE.precision);
    expect(schedule).toHaveLength(13);
  });

  test('first line period 15-Jan to 31-Jan with 17 days', () => {
    const schedule = calc.calculateMonthlySchedule(FIXTURE.amount, FIXTURE.start, FIXTURE.end, FIXTURE.precision);
    expect(schedule[0].periodStart).toBe('2026-01-15');
    expect(schedule[0].periodEnd).toBe('2026-01-31');
    expect(schedule[0].serviceDays).toBe(17);
  });

  test('last line period 01-Jan-2027 to 14-Jan-2027 with 14 days', () => {
    const schedule = calc.calculateMonthlySchedule(FIXTURE.amount, FIXTURE.start, FIXTURE.end, FIXTURE.precision);
    const last = schedule[schedule.length - 1];
    expect(last.periodStart).toBe('2027-01-01');
    expect(last.periodEnd).toBe('2027-01-14');
    expect(last.serviceDays).toBe(14);
  });

  test('sum of service days = 365', () => {
    const schedule = calc.calculateMonthlySchedule(FIXTURE.amount, FIXTURE.start, FIXTURE.end, FIXTURE.precision);
    expect(sumDays(schedule)).toBe(365);
  });

  test('sum of recognition amounts = 120000 exactly', () => {
    const schedule = calc.calculateMonthlySchedule(FIXTURE.amount, FIXTURE.start, FIXTURE.end, FIXTURE.precision);
    expect(sumAmounts(schedule)).toBe(120000);
  });

  test('validateScheduleTotals passes with zero difference', () => {
    const schedule = calc.calculateMonthlySchedule(FIXTURE.amount, FIXTURE.start, FIXTURE.end, FIXTURE.precision);
    const v = calc.validateScheduleTotals(schedule, FIXTURE.amount, FIXTURE.precision);
    expect(v.valid).toBe(true);
    expect(v.difference).toBe('0.00');
  });

  test('final line absorbs rounding residual', () => {
    const schedule = calc.calculateMonthlySchedule(FIXTURE.amount, FIXTURE.start, FIXTURE.end, FIXTURE.precision);
    const last = schedule[schedule.length - 1];
    expect(last.isFinalAdjustment).toBe(true);
  });

  test('daily rate precision string', () => {
    const rate = calc.calculateDailyRate(FIXTURE.amount, 365);
    expect(rate).toMatch(/^\d+\.\d{6}$/);
    expect(parseFloat(rate)).toBeCloseTo(120000 / 365, 6);
  });
});

describe('leaseRevenueCalculation.service — edge cases', () => {
  test('same-day period = 1 day', () => {
    expect(calc.calculateInclusiveDays('2026-03-15', '2026-03-15')).toBe(1);
    const schedule = calc.calculateMonthlySchedule('1000', '2026-03-15', '2026-03-15', 2);
    expect(schedule).toHaveLength(1);
    expect(sumAmounts(schedule)).toBe(1000);
  });

  test('start on first day of month', () => {
    const schedule = calc.calculateMonthlySchedule('3000', '2026-01-01', '2026-01-31', 2);
    expect(schedule[0].serviceDays).toBe(31);
    expect(sumAmounts(schedule)).toBe(3000);
  });

  test('start on last day of month', () => {
    const days = calc.calculateInclusiveDays('2026-01-31', '2026-02-28');
    expect(days).toBe(29);
  });

  test('end on first day of month', () => {
    const schedule = calc.calculateMonthlySchedule('500', '2026-02-28', '2026-03-01', 2);
    expect(sumDays(schedule)).toBe(2);
    expect(sumAmounts(schedule)).toBe(500);
  });

  test('end on last day of month', () => {
    const schedule = calc.calculateMonthlySchedule('900', '2026-04-01', '2026-04-30', 2);
    expect(schedule[0].serviceDays).toBe(30);
    expect(sumAmounts(schedule)).toBe(900);
  });

  test('February leap year 2024', () => {
    const schedule = calc.calculateMonthlySchedule('2900', '2024-02-01', '2024-02-29', 2);
    expect(schedule[0].serviceDays).toBe(29);
    expect(sumAmounts(schedule)).toBe(2900);
  });

  test('February non-leap year 2025', () => {
    const schedule = calc.calculateMonthlySchedule('2800', '2025-02-01', '2025-02-28', 2);
    expect(schedule[0].serviceDays).toBe(28);
    expect(sumAmounts(schedule)).toBe(2800);
  });

  test('366-day leap year span', () => {
    const start = '2024-01-01';
    const end = '2024-12-31';
    expect(calc.calculateInclusiveDays(start, end)).toBe(366);
    const schedule = calc.calculateMonthlySchedule('36600', start, end, 2);
    expect(sumDays(schedule)).toBe(366);
    expect(sumAmounts(schedule)).toBe(36600);
  });

  test('multi-year span', () => {
    const schedule = calc.calculateMonthlySchedule('10000', '2024-06-15', '2026-08-20', 2);
    expect(schedule.length).toBeGreaterThan(24);
    expect(sumAmounts(schedule)).toBe(10000);
  });

  test('foreign currency precision 2', () => {
    const schedule = calc.calculateMonthlySchedule('999.99', '2026-01-01', '2026-03-31', 2);
    expect(sumAmounts(schedule)).toBeCloseTo(999.99, 2);
    const v = calc.validateScheduleTotals(schedule, '999.99', 2);
    expect(v.valid).toBe(true);
  });

  test('very small amount', () => {
    const schedule = calc.calculateMonthlySchedule('0.03', '2026-01-01', '2026-01-03', 2);
    expect(sumAmounts(schedule)).toBe(0.03);
  });

  test('very large amount', () => {
    const schedule = calc.calculateMonthlySchedule('999999999.99', '2026-01-01', '2026-12-31', 2);
    expect(sumAmounts(schedule)).toBe(999999999.99);
  });

  test('splitIntoCalendarMonths recognitionMonth keys', () => {
    const months = calc.splitIntoCalendarMonths('2026-11-20', '2027-02-10');
    expect(months.map((m) => m.recognitionMonth)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
  });

  test('equalMonthlySchedule sums to total', () => {
    const schedule = calc.equalMonthlySchedule('12000', '2026-01-15', '2026-04-14', 2);
    expect(sumAmounts(schedule)).toBe(12000);
  });

  test('applyFinalRoundingAdjustment fixes drift', () => {
    const schedule = [
      { scheduledAmount: '33.33', serviceDays: 1 },
      { scheduledAmount: '33.33', serviceDays: 1 },
      { scheduledAmount: '33.33', serviceDays: 1 },
    ];
    calc.applyFinalRoundingAdjustment(schedule, '100.00', 2);
    expect(sumAmounts(schedule)).toBe(100);
  });

  test('rejects end before start', () => {
    expect(() => calc.calculateInclusiveDays('2026-02-01', '2026-01-01')).toThrow(/on or after/);
  });

  test('calculateRemainingSchedule matches full when same range', () => {
    const a = calc.calculateMonthlySchedule('5000', '2026-05-01', '2026-08-31', 2);
    const b = calc.calculateRemainingSchedule('5000', '2026-05-01', '2026-08-31', 2);
    expect(sumAmounts(a)).toBe(sumAmounts(b));
  });

  test('365-day non-leap year boundary', () => {
    expect(calc.calculateInclusiveDays('2025-01-01', '2025-12-31')).toBe(365);
  });

  test('month-end January partial from mid-month', () => {
    const periods = calc.splitIntoCalendarMonths('2026-01-20', '2026-02-10');
    expect(periods[0].serviceDays).toBe(12);
    expect(periods[1].serviceDays).toBe(10);
  });
});

describe('leaseRevenueCalculation.service — splitIntoCalendarMonths', () => {
  test('single month full', () => {
    const p = calc.splitIntoCalendarMonths('2026-07-01', '2026-07-31');
    expect(p).toHaveLength(1);
    expect(p[0].serviceDays).toBe(31);
  });

  test('cross-year December-January', () => {
    const p = calc.splitIntoCalendarMonths('2026-12-15', '2027-01-15');
    expect(p).toHaveLength(2);
    expect(p[0].recognitionMonth).toBe('2026-12');
    expect(p[1].recognitionMonth).toBe('2027-01');
  });
});

describe('leaseRevenueCalculation.service — re-export parity', () => {
  test('wraps prepaid calculation exports', () => {
    const prepaid = require('../../services/prepaidExpenses/prepaidCalculation.service');
    expect(calc.calculateMonthlySchedule).toBe(prepaid.calculateMonthlySchedule);
    expect(calc.validateScheduleTotals).toBe(prepaid.validateScheduleTotals);
  });
});
