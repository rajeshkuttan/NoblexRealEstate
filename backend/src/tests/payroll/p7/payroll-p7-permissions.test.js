const { PAYROLL_EXTRA_PERMISSIONS } = require('../../../config/permissions');

describe('P7 permissions', () => {
  const codes = PAYROLL_EXTRA_PERMISSIONS.map((p) => p.code);
  test('documents.view', () => expect(codes).toContain('payroll.documents.view'));
  test('documents.manage', () => expect(codes).toContain('payroll.documents.manage'));
  test('documents.publish', () => expect(codes).toContain('payroll.documents.publish'));
  test('total payroll codes is 29', () => expect(codes.length).toBe(29));
});
