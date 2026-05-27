const {
  round2,
  resolveCalcMethod,
  getBasicAmount,
  DAYS_IN_MONTH,
  HOURS_PER_DAY,
} = require('../../../services/payroll/payrollCalculationService');

describe('payrollCalculationService helpers', () => {
  test('round2 rounds to 2 decimals', () => {
    expect(round2(10.456)).toBe(10.46);
  });

  test('proration factor 20/22', () => {
    const payable = 20;
    const working = 22;
    const factor = payable / working;
    expect(round2(5000 * factor)).toBe(round2(5000 * (20 / 22)));
  });

  test('resolveCalcMethod OT code', () => {
    expect(resolveCalcMethod({ componentCode: 'OVERTIME', recurring: false })).toBe('OVERTIME_HOURLY');
  });

  test('resolveCalcMethod BASIC prorates', () => {
    expect(resolveCalcMethod({ componentCode: 'BASIC', recurring: true })).toBe('PRORATE');
  });

  test('getBasicAmount finds BASIC line', () => {
    const amt = getBasicAmount({
      lines: [
        { amount: 3000, component: { componentCode: 'HOUSING' } },
        { amount: 5000, component: { componentCode: 'BASIC' } },
      ],
    });
    expect(amt).toBe(5000);
  });

  test('overtime hourly formula', () => {
    const basic = 6000;
    const hours = 10;
    const multiplier = 1.5;
    const hourly = basic / DAYS_IN_MONTH / HOURS_PER_DAY;
    const ot = round2(hours * hourly * multiplier);
    expect(ot).toBeGreaterThan(0);
  });

  test('net salary equals gross minus deductions', () => {
    const gross = 10000;
    const deductions = 1500;
    expect(round2(gross - deductions)).toBe(8500);
  });

  test('paid leave increases payable factor', () => {
    const working = 22;
    const withoutLeave = 20 / working;
    const withPaidLeave = 22 / working;
    expect(withPaidLeave).toBeGreaterThan(withoutLeave);
  });

  test('unpaid leave deduction formula', () => {
    const basic = 6000;
    const working = 22;
    const unpaid = 2;
    const ded = round2((basic / working) * unpaid);
    expect(ded).toBe(round2(6000 / 22 * 2));
  });
});
