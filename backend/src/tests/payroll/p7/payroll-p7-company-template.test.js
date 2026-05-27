const { CompanyDocumentTemplate } = require('../../../models');

describe('CompanyDocumentTemplate P7 fields', () => {
  test('watermark field', () => {
    expect(CompanyDocumentTemplate.rawAttributes.watermark).toBeDefined();
  });
  test('showCompanyAddress field', () => {
    expect(CompanyDocumentTemplate.rawAttributes.showCompanyAddress.field).toBe('show_company_address');
  });
});
