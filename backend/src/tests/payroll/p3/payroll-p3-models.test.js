const p3 = require('../../../models/payrollP3Models');

describe('P3 models', () => {
  const names = [
    'PayrollPeriod',
    'PayrollRun',
    'PayrollRunEmployee',
    'PayrollRunComponentLine',
    'PayrollMonthlyAdjustment',
    'EmployeeLoan',
    'EmployeeLoanInstallment',
  ];
  test.each(names)('%s exported', (n) => {
    expect(p3[n]).toBeDefined();
    expect(p3[n].tableName).toBeTruthy();
  });
});
