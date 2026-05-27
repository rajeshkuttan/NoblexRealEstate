const { PAYROLL_EXTRA_PERMISSIONS } = require('../../../config/permissions');

describe('P3 permissions', () => {
  const codes = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);
  test('processing.view', () => expect(codes).toContain('payroll.processing.view'));
  test('processing.manage', () => expect(codes).toContain('payroll.processing.manage'));
  test('processing.approve', () => expect(codes).toContain('payroll.processing.approve'));
  test('total payroll codes is 29', () => expect(codes.length).toBe(29));
});
