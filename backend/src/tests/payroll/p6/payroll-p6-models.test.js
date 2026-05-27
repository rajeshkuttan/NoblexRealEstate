const p6 = require('../../../models/payrollP6Models');

describe('payrollP6Models', () => {
  test('PayrollAccountConfiguration table', () => {
    expect(p6.PayrollAccountConfiguration.tableName).toBe('payroll_account_configurations');
  });
  test('EmployeeLedgerHeader table', () => {
    expect(p6.EmployeeLedgerHeader.tableName).toBe('employee_ledger_headers');
  });
  test('EmployeeLedgerLine table', () => {
    expect(p6.EmployeeLedgerLine.tableName).toBe('employee_ledger_lines');
  });
  test('financePostingFields includes status enum', () => {
    expect(p6.financePostingFields.financePostingStatus.type.values).toContain('UNPOSTED');
    expect(p6.financePostingFields.financePostingStatus.type.values).toContain('POSTED');
    expect(p6.financePostingFields.financePostingStatus.type.values).toContain('REVERSED');
  });
});
