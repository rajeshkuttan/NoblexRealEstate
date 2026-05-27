const { COMPANY_AUDIT_ACTIONS } = require('../../../services/companyAuditService');

describe('P3 audit actions', () => {
  const actions = [
    'PAYROLL_RUN_CREATED',
    'PAYROLL_CALCULATED',
    'PAYROLL_APPROVED',
    'PAYROLL_LOCKED',
    'PAYROLL_REVERSED',
    'PAYROLL_ADJUSTMENT_APPROVED',
  ];
  test.each(actions)('%s defined', (a) => {
    expect(COMPANY_AUDIT_ACTIONS[a]).toBe(a);
  });
});
