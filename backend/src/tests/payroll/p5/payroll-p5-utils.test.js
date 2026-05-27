const {
  round2,
  dailySalary,
  monthsOfService,
  yearsOfService,
  getBasicMonthlyAmount,
  proRataSalaryPayable,
} = require('../../../services/payroll/payrollSettlementUtils');

describe('payrollSettlementUtils', () => {
  test('round2', () => {
    expect(round2(10.456)).toBe(10.46);
  });

  test('dailySalary divides by 30', () => {
    expect(dailySalary(6000)).toBe(200);
  });

  test('monthsOfService partial', () => {
    const m = monthsOfService('2020-01-15', '2022-07-15');
    expect(m).toBeGreaterThan(29);
    expect(m).toBeLessThan(31);
  });

  test('yearsOfService', () => {
    const y = yearsOfService('2020-01-01', '2025-01-01');
    expect(y).toBeCloseTo(5, 0);
  });

  test('getBasicMonthlyAmount finds BASIC', () => {
    expect(
      getBasicMonthlyAmount({
        lines: [{ amount: 5000, component: { componentCode: 'BASIC' } }],
      })
    ).toBe(5000);
  });

  test('proRataSalaryPayable mid-month', () => {
    const amt = proRataSalaryPayable(3000, '2026-03-15');
    expect(amt).toBeGreaterThan(0);
    expect(amt).toBeLessThan(3000);
  });
});
