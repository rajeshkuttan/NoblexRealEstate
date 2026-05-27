const { PAYROLL_EXTRA_PERMISSIONS, PAYROLL_PERMISSION_CODES, SYSTEM_ROLE_PERMISSIONS } = require('../../config/permissions');

describe('Payroll permissions', () => {
  test('all P1 payroll permission codes defined', () => {
    const codes = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);
    expect(codes).toContain('payroll.organization.view');
    expect(codes).toContain('payroll.organization.manage');
    expect(codes).toContain('payroll.employee.view');
    expect(codes).toContain('payroll.employee.manage');
    expect(codes).toContain('payroll.salary.view');
    expect(codes).toContain('payroll.salary.manage');
    expect(codes).toContain('payroll.document.view');
    expect(codes).toContain('payroll.document.manage');
    expect(codes).toContain('payroll.policy.view');
    expect(codes).toContain('payroll.policy.manage');
    expect(codes).toContain('payroll.attendance.view');
    expect(codes).toContain('payroll.leave.operations.manage');
    expect(codes).toContain('payroll.processing.view');
    expect(codes).toContain('payroll.wps.view');
    expect(codes).toContain('payroll.wps.manage');
    expect(codes).toContain('payroll.wps.approve');
    expect(codes).toContain('payroll.settlement.view');
    expect(codes).toContain('payroll.finance.view');
    expect(codes).toContain('payroll.finance.manage');
    expect(codes).toContain('payroll.finance.approve');
    expect(codes).toContain('payroll.documents.view');
    expect(codes.length).toBe(29);
  });

  test('finance_manager includes payroll permissions', () => {
    for (const code of PAYROLL_PERMISSION_CODES) {
      expect(SYSTEM_ROLE_PERMISSIONS.finance_manager).toContain(code);
    }
  });

  test('admin includes payroll via ALL definitions', () => {
    const { PERMISSION_DEFINITIONS } = require('../../config/permissions');
    expect(PERMISSION_DEFINITIONS.some((p) => p.code === 'payroll.employee.view')).toBe(true);
  });
});
