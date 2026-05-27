const { PAYROLL_EXTRA_PERMISSIONS } = require('../../../config/permissions');

describe('P5 permissions', () => {
  const codes = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);
  test('settlement.view', () => expect(codes).toContain('payroll.settlement.view'));
  test('settlement.manage', () => expect(codes).toContain('payroll.settlement.manage'));
  test('settlement.approve', () => expect(codes).toContain('payroll.settlement.approve'));
  test('total payroll codes is 29', () => expect(codes.length).toBe(29));
});
