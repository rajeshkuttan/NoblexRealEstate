const { REPORT_TYPES } = require('../../../services/payroll/payrollExport.service');

describe('payrollExport.service', () => {
  test('report types include payroll_register', () => {
    expect(REPORT_TYPES).toContain('payroll_register');
    expect(REPORT_TYPES).toContain('payslip_register');
    expect(REPORT_TYPES).toContain('certificate_register');
  });
  test('report types count', () => {
    expect(REPORT_TYPES.length).toBeGreaterThanOrEqual(10);
  });
});
