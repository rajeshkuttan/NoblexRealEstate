const p4 = require('../../../models/payrollP4Models');

describe('payrollP4Models', () => {
  test('exports PayrollWpsConfiguration', () => {
    expect(p4.PayrollWpsConfiguration).toBeDefined();
    expect(p4.PayrollWpsConfiguration.tableName).toBe('payroll_wps_configurations');
  });

  test('exports PayrollWpsBatch', () => {
    expect(p4.PayrollWpsBatch.tableName).toBe('payroll_wps_batches');
  });

  test('exports PayrollWpsEmployeeLine', () => {
    expect(p4.PayrollWpsEmployeeLine.tableName).toBe('payroll_wps_employee_lines');
  });

  test('exports PayrollWpsSifExport', () => {
    expect(p4.PayrollWpsSifExport.tableName).toBe('payroll_wps_sif_exports');
  });

  test('exports PayrollGpssaConfiguration', () => {
    expect(p4.PayrollGpssaConfiguration.tableName).toBe('payroll_gpssa_configuration');
  });
});
