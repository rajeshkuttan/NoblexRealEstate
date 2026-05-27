describe('Payroll models', () => {
  test('all payroll models exported from index', () => {
    const models = require('../../models');
    expect(models.Employee).toBeDefined();
    expect(models.Department).toBeDefined();
    expect(models.PayrollComponent).toBeDefined();
    expect(models.EmployeeSalaryStructure).toBeDefined();
    expect(models.VisaSponsorCompany).toBeDefined();
    expect(models.ShiftMaster).toBeDefined();
    expect(models.LeavePolicy).toBeDefined();
  });

  test('Employee table name', () => {
    const { Employee } = require('../../models');
    expect(Employee.tableName).toBe('employees');
  });

  test('PayrollComponent has component types', () => {
    const { PayrollComponent } = require('../../models');
    const t = PayrollComponent.rawAttributes.componentType.type;
    expect(t.values).toEqual(expect.arrayContaining(['EARNING', 'DEDUCTION']));
  });
});
