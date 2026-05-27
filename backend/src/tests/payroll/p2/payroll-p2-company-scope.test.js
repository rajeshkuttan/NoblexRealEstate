const { stripCompanyFromBody, withCompanyId, companyWhere } = require('../../../utils/companyScope');

describe('P2 company scope helpers', () => {
  test('stripCompanyFromBody removes company_id', () => {
    const body = stripCompanyFromBody({ employee_id: 1, company_id: 999 });
    expect(body.company_id).toBeUndefined();
    expect(body.employee_id).toBe(1);
  });

  test('withCompanyId uses req.companyId not body', () => {
    const out = withCompanyId({ companyId: 1 }, { employee_id: 2, company_id: 99 });
    expect(out.companyId).toBe(1);
  });

  test('companyWhere scopes queries', () => {
    expect(companyWhere({ companyId: 5 })).toEqual({ companyId: 5 });
  });
});
