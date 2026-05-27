jest.mock('../../utils/companyScope', () => {
  const actual = jest.requireActual('../../utils/companyScope');
  return {
    ...actual,
    assertAccountInCompany: jest.fn().mockResolvedValue(true),
  };
});

const { assertEmployeeInCompany, assertDepartmentInCompany, companyWhere } = require('../../utils/companyScope');
const { Employee, Department } = require('../../models');

describe('Payroll company scope', () => {
  afterEach(() => jest.restoreAllMocks());

  test('companyWhere requires companyId', () => {
    expect(() => companyWhere({})).toThrow('Company context missing');
    expect(companyWhere({ companyId: 5 })).toEqual({ companyId: 5 });
  });

  test('assertEmployeeInCompany blocks wrong company', async () => {
    jest.spyOn(Employee, 'findOne').mockResolvedValue(null);
    await expect(assertEmployeeInCompany(1, { companyId: 2 })).rejects.toThrow(/active company/);
  });

  test('assertEmployeeInCompany passes same company', async () => {
    const emp = { id: 1, companyId: 2 };
    jest.spyOn(Employee, 'findOne').mockResolvedValue(emp);
    const result = await assertEmployeeInCompany(1, { companyId: 2 });
    expect(result).toBe(emp);
  });

  test('assertDepartmentInCompany passes', async () => {
    const dept = { id: 3, companyId: 1 };
    jest.spyOn(Department, 'findOne').mockResolvedValue(dept);
    const result = await assertDepartmentInCompany(3, { companyId: 1 });
    expect(result).toBe(dept);
  });
});
