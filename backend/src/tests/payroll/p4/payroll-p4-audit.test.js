const { COMPANY_AUDIT_ACTIONS } = require('../../../services/companyAuditService');

describe('P4 audit actions', () => {
  const actions = [
    'WPS_BATCH_GENERATED',
    'WPS_BATCH_APPROVED',
    'WPS_BATCH_EXPORTED',
    'WPS_VALIDATION_FAILED',
    'COMPLIANCE_EXCEPTION_FOUND',
  ];
  test.each(actions)('%s defined', (a) => {
    expect(COMPANY_AUDIT_ACTIONS[a]).toBe(a);
  });
});
