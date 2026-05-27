const { stripCompanyFromBody, withCompanyId } = require('../../../utils/companyScope');

describe('P3 company scope', () => {
  test('body company_id ignored', () => {
    const body = stripCompanyFromBody({ payroll_period_id: 1, company_id: 99 });
    expect(body.company_id).toBeUndefined();
  });

  test('withCompanyId uses req', () => {
    expect(withCompanyId({ companyId: 3 }, { company_id: 99 }).companyId).toBe(3);
  });
});
