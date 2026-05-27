const { COMPANY_AUDIT_ACTIONS } = require('../../../services/companyAuditService');

describe('P6 audit actions', () => {
  const actions = [
    'PAYROLL_POSTED',
    'PAYROLL_POSTING_REVERSED',
    'SETTLEMENT_POSTED',
    'SETTLEMENT_REVERSED',
    'EMPLOYEE_LEDGER_UPDATED',
    'PAYROLL_RECONCILIATION_EXCEPTION',
  ];
  test.each(actions)('%s defined', (a) => {
    expect(COMPANY_AUDIT_ACTIONS[a]).toBe(a);
  });
});
