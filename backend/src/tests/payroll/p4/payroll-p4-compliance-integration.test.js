jest.mock('../../../models', () => ({
  PayrollRun: { findOne: jest.fn() },
  PayrollRunEmployee: { findAll: jest.fn() },
  PayrollWpsConfiguration: { findOne: jest.fn() },
  Employee: {},
  EmployeeBankDetail: { findOne: jest.fn() },
  EmployeeDocument: { findAll: jest.fn(), findOne: jest.fn() },
}));

const {
  PayrollRun,
  PayrollRunEmployee,
  PayrollWpsConfiguration,
  EmployeeBankDetail,
  EmployeeDocument,
} = require('../../../models');
const { validatePayrollCompliance } = require('../../../services/payroll/payrollComplianceService');

describe('validatePayrollCompliance integration', () => {
  afterEach(() => jest.clearAllMocks());

  test('unapproved run returns ERROR', async () => {
    PayrollRun.findOne.mockResolvedValue({ id: 1, status: 'DRAFT' });
    const r = await validatePayrollCompliance({ companyId: 1, payrollRunId: 1 });
    expect(r.issues.some((i) => i.code === 'RUN_NOT_APPROVED')).toBe(true);
  });

  test('missing WPS config returns ERROR', async () => {
    PayrollRun.findOne.mockResolvedValue({ id: 1, status: 'APPROVED' });
    PayrollWpsConfiguration.findOne.mockResolvedValue(null);
    PayrollRunEmployee.findAll.mockResolvedValue([]);
    const r = await validatePayrollCompliance({ companyId: 1, payrollRunId: 1 });
    expect(r.issues.some((i) => i.code === 'MISSING_WPS_CONFIG')).toBe(true);
  });

  test('run not found', async () => {
    PayrollRun.findOne.mockResolvedValue(null);
    const r = await validatePayrollCompliance({ companyId: 1, payrollRunId: 99 });
    expect(r.issues.some((i) => i.code === 'RUN_NOT_FOUND')).toBe(true);
  });

  test('inactive employee in run', async () => {
    PayrollRun.findOne.mockResolvedValue({ id: 1, status: 'APPROVED' });
    PayrollWpsConfiguration.findOne.mockResolvedValue({ molEstablishmentId: 'MOL' });
    PayrollRunEmployee.findAll.mockResolvedValue([
      { employee: { id: 10, employeeNo: 'E1', status: 'terminated' }, netSalary: 1000 },
    ]);
    EmployeeBankDetail.findOne.mockResolvedValue(null);
    EmployeeDocument.findAll.mockResolvedValue([]);
    const r = await validatePayrollCompliance({ companyId: 1, payrollRunId: 1 });
    expect(r.issues.some((i) => i.code === 'INACTIVE_EMPLOYEE')).toBe(true);
  });
});
