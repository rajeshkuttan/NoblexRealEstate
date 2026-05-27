jest.mock('../../utils/companyScope', () => {
  const actual = jest.requireActual('../../utils/companyScope');
  return {
    ...actual,
    assertRecordInCompany: jest.fn(),
    assertEmployeeInCompany: jest.fn().mockResolvedValue(true),
    withCompanyId: (req, p) => ({ ...p, companyId: req.companyId }),
    stripCompanyFromBody: (b) => b,
    companyWhere: (req) => ({ companyId: req.companyId }),
  };
});

jest.mock('../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn(),
  COMPANY_AUDIT_ACTIONS: { SALARY_STRUCTURE_UPDATED: 'SALARY_STRUCTURE_UPDATED' },
}));

const sal = require('../../controllers/payrollSalaryController');
const { EmployeeSalaryStructure, EmployeeSalaryLine } = require('../../models');

describe('Payroll salary structure', () => {
  test('create persists lines', async () => {
    jest.spyOn(EmployeeSalaryStructure, 'create').mockResolvedValue({ id: 100 });
    jest.spyOn(EmployeeSalaryLine, 'destroy').mockResolvedValue(0);
    jest.spyOn(EmployeeSalaryLine, 'create').mockResolvedValue({});
    jest.spyOn(EmployeeSalaryStructure, 'findOne').mockResolvedValue({ id: 100, lines: [] });

    const json = jest.fn();
    await sal.create(
      {
        companyId: 1,
        body: {
          employeeId: 2,
          effectiveFrom: '2026-01-01',
          lines: [{ amount: 5000, lineDescription: 'Basic' }],
        },
      },
      { status: (c) => ({ json }), json },
      jest.fn()
    );
    expect(EmployeeSalaryLine.create).toHaveBeenCalled();
  });
});
