const { makeCrudHandlers } = require('../../utils/payrollCrud');
const { PayrollComponent, ShiftMaster } = require('../../models');

describe('Payroll component and shift models', () => {
  test('PayrollComponent table', () => {
    expect(PayrollComponent.tableName).toBe('payroll_components');
  });

  test('ShiftMaster has overtime flag', () => {
    expect(ShiftMaster.rawAttributes.overtimeEligible).toBeDefined();
  });

  test('component crud search fields', async () => {
    jest.spyOn(PayrollComponent, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
    const { list } = makeCrudHandlers(PayrollComponent, { searchFields: ['componentCode'] });
    const json = jest.fn();
    await list({ companyId: 1, query: { search: 'BASIC' } }, { json }, jest.fn());
    expect(PayrollComponent.findAndCountAll).toHaveBeenCalled();
  });
});

describe('Employee history immutability', () => {
  test('EmployeeHistory has no updatedAt', () => {
    const { EmployeeHistory } = require('../../models');
    expect(EmployeeHistory.options.updatedAt).toBe(false);
  });

  test('event types enum includes TRANSFER', () => {
    const { EmployeeHistory } = require('../../models');
    expect(EmployeeHistory.rawAttributes.eventType.type.values).toContain('TRANSFER');
  });
});

describe('Payroll P1 scope guards', () => {
  test('payrollModels exports EmployeeAssignment', () => {
    const pm = require('../../models/payrollModels');
    expect(pm.EmployeeAssignment).toBeDefined();
  });

  test('EmployeeDocument document types include passport', () => {
    const { EmployeeDocument } = require('../../models');
    expect(EmployeeDocument.rawAttributes.documentType.type.values).toContain('passport');
  });
});
