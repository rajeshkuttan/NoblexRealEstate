const { PAYROLL_EXTRA_PERMISSIONS } = require('../../../config/permissions');

describe('P2 RBAC permissions', () => {
  const codes = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);

  test('includes payroll.attendance.view', () => {
    expect(codes).toContain('payroll.attendance.view');
  });

  test('includes payroll.attendance.manage', () => {
    expect(codes).toContain('payroll.attendance.manage');
  });

  test('includes payroll.leave.operations.view', () => {
    expect(codes).toContain('payroll.leave.operations.view');
  });

  test('includes payroll.leave.operations.manage', () => {
    expect(codes).toContain('payroll.leave.operations.manage');
  });
});
