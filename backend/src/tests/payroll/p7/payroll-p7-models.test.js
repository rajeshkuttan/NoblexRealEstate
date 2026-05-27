const p7 = require('../../../models/payrollP7Models');

describe('payrollP7Models', () => {
  test('PayrollPayslip table', () => {
    expect(p7.PayrollPayslip.tableName).toBe('payroll_payslips');
  });
  test('PayrollExport table', () => {
    expect(p7.PayrollExport.tableName).toBe('payroll_exports');
  });
  test('PayrollBatchJob table', () => {
    expect(p7.PayrollBatchJob.tableName).toBe('payroll_batch_jobs');
  });
  test('PayrollDocumentDistributionQueue table', () => {
    expect(p7.PayrollDocumentDistributionQueue.tableName).toBe('payroll_document_distribution_queue');
  });
  test('payslip status enum', () => {
    expect(p7.PayrollPayslip.rawAttributes.status.type.values).toContain('PUBLISHED');
  });
});
