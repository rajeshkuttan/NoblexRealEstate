const { COMPANY_AUDIT_ACTIONS } = require('../../../services/companyAuditService');

describe('P7 audit actions', () => {
  const actions = [
    'PAYSLIP_GENERATED',
    'PAYSLIP_PUBLISHED',
    'PAYSLIP_VOIDED',
    'SALARY_CERTIFICATE_GENERATED',
    'SETTLEMENT_DOCUMENT_GENERATED',
    'PAYROLL_EXPORT_GENERATED',
  ];
  test.each(actions)('%s defined', (a) => {
    expect(COMPANY_AUDIT_ACTIONS[a]).toBe(a);
  });
});
