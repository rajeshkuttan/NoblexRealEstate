const { REPORT_TYPES } = require('../../../services/payroll/payrollExport.service');

describe('P7 report coverage', () => {
  test.each([
    'payroll_variance',
    'wps_register',
    'settlement_register',
    'employee_ledger',
    'attendance_summary',
    'loan_report',
    'eos_liability',
  ])('includes %s', (t) => {
    expect(REPORT_TYPES).toContain(t);
  });
});
