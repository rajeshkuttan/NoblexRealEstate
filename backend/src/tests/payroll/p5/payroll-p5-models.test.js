const p5 = require('../../../models/payrollP5Models');

describe('payrollP5Models', () => {
  test('PayrollEosConfiguration table', () => {
    expect(p5.PayrollEosConfiguration.tableName).toBe('payroll_eos_configurations');
  });
  test('EmployeeSeparation table', () => {
    expect(p5.EmployeeSeparation.tableName).toBe('employee_separations');
  });
  test('PayrollFinalSettlement table', () => {
    expect(p5.PayrollFinalSettlement.tableName).toBe('payroll_final_settlements');
  });
  test('PayrollFinalSettlementLine table', () => {
    expect(p5.PayrollFinalSettlementLine.tableName).toBe('payroll_final_settlement_lines');
  });
  test('PayrollEosRuleTier table', () => {
    expect(p5.PayrollEosRuleTier.tableName).toBe('payroll_eos_rule_tiers');
  });
});
