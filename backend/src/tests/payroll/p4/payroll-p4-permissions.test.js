const { PAYROLL_EXTRA_PERMISSIONS } = require('../../../config/permissions');

describe('P4 permissions', () => {
  const codes = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);
  test('wps.view', () => expect(codes).toContain('payroll.wps.view'));
  test('wps.manage', () => expect(codes).toContain('payroll.wps.manage'));
  test('wps.approve', () => expect(codes).toContain('payroll.wps.approve'));
  test('total payroll codes is 29', () => expect(codes.length).toBe(29));
});
