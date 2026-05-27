const { COMPANY_AUDIT_ACTIONS } = require('../../../services/companyAuditService');

describe('P5 audit actions', () => {
  const actions = [
    'EMPLOYEE_SEPARATION_CREATED',
    'FINAL_SETTLEMENT_GENERATED',
    'FINAL_SETTLEMENT_APPROVED',
    'FINAL_SETTLEMENT_LOCKED',
    'EOS_CALCULATED',
    'LEAVE_ENCASHMENT_CALCULATED',
  ];
  test.each(actions)('%s defined', (a) => {
    expect(COMPANY_AUDIT_ACTIONS[a]).toBe(a);
  });
});
