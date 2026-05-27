const { AccountsTrans } = require('../../../models');

describe('AccountsTrans payroll FK fields', () => {
  test('payrollRunId field defined', () => {
    expect(AccountsTrans.rawAttributes.payrollRunId).toBeDefined();
    expect(AccountsTrans.rawAttributes.payrollRunId.field).toBe('payroll_run_id');
  });
  test('payrollSettlementId field defined', () => {
    expect(AccountsTrans.rawAttributes.payrollSettlementId).toBeDefined();
    expect(AccountsTrans.rawAttributes.payrollSettlementId.field).toBe('payroll_settlement_id');
  });
  test('payrollWpsBatchId field defined', () => {
    expect(AccountsTrans.rawAttributes.payrollWpsBatchId).toBeDefined();
    expect(AccountsTrans.rawAttributes.payrollWpsBatchId.field).toBe('payroll_wps_batch_id');
  });
});
