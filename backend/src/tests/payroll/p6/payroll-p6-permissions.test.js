const { PAYROLL_EXTRA_PERMISSIONS } = require('../../../config/permissions');

describe('P6 permissions', () => {
  const codes = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);
  test('finance.view', () => expect(codes).toContain('payroll.finance.view'));
  test('finance.manage', () => expect(codes).toContain('payroll.finance.manage'));
  test('finance.approve', () => expect(codes).toContain('payroll.finance.approve'));
  test('total payroll codes is 29', () => expect(codes.length).toBe(29));
});
