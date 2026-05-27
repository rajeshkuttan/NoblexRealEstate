jest.mock('../../../models', () => ({
  PayrollRun: { findOne: jest.fn() },
  PayrollRunEmployee: { findAll: jest.fn() },
  PayrollWpsBatch: { findOne: jest.fn(), create: jest.fn() },
  PayrollWpsEmployeeLine: { create: jest.fn() },
  PayrollWpsSifExport: { create: jest.fn() },
  PayrollWpsConfiguration: { findOne: jest.fn() },
  CompanySetting: { findByPk: jest.fn() },
}));

jest.mock('../../../services/payroll/payrollComplianceService', () => ({
  validatePayrollCompliance: jest.fn(),
  validateEmployeeWpsLine: jest.fn(),
  hasBlockingErrors: jest.fn(),
  getPrimaryBank: jest.fn(),
  getLabourCardFromDocs: jest.fn().mockResolvedValue(null),
}));

const {
  PayrollRun,
  PayrollRunEmployee,
  PayrollWpsBatch,
  PayrollWpsEmployeeLine,
  PayrollWpsConfiguration,
} = require('../../../models');
const {
  validatePayrollCompliance,
  hasBlockingErrors,
  validateEmployeeWpsLine,
  getPrimaryBank,
} = require('../../../services/payroll/payrollComplianceService');
const { generateWpsBatch, assertNoActiveBatch } = require('../../../services/payroll/payrollWpsBatchService');

describe('payrollWpsBatchService', () => {
  afterEach(() => jest.clearAllMocks());

  test('generate blocks unapproved run', async () => {
    PayrollRun.findOne.mockResolvedValue({
      id: 1,
      status: 'CALCULATED',
      payrollPeriod: { periodMonth: 1, periodYear: 2026 },
    });
    await expect(generateWpsBatch({ companyId: 1, payrollRunId: 1 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('generate blocks on compliance errors', async () => {
    PayrollRun.findOne.mockResolvedValue({
      id: 1,
      status: 'APPROVED',
      payrollPeriod: { periodMonth: 1, periodYear: 2026 },
    });
    validatePayrollCompliance.mockResolvedValue({ issues: [{ severity: 'ERROR' }] });
    hasBlockingErrors.mockReturnValue(true);
    await expect(generateWpsBatch({ companyId: 1, payrollRunId: 1 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('assertNoActiveBatch throws when batch exists', async () => {
    PayrollWpsBatch.findOne.mockResolvedValue({ id: 1 });
    await expect(assertNoActiveBatch(1, 5)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('generate creates batch and lines', async () => {
    PayrollRun.findOne.mockResolvedValue({
      id: 1,
      status: 'APPROVED',
      payrollPeriod: { periodMonth: 6, periodYear: 2026 },
    });
    validatePayrollCompliance.mockResolvedValue({ issues: [] });
    hasBlockingErrors.mockReturnValue(false);
    PayrollWpsBatch.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    PayrollWpsConfiguration.findOne.mockResolvedValue({
      defaultSalaryType: 'BASIC',
      molEstablishmentId: 'MOL',
    });
    PayrollWpsBatch.create.mockResolvedValue({ id: 10, update: jest.fn().mockResolvedValue({}) });
    PayrollRunEmployee.findAll.mockResolvedValue([
      { netSalary: 5000, employee: { id: 2, employeeNo: 'E1', employeeName: 'Test' } },
    ]);
    validateEmployeeWpsLine.mockReturnValue({ status: 'VALID', issues: [] });
    getPrimaryBank.mockResolvedValue({
      iban: 'AE070331234567890123456',
      molPersonalId: 'M1',
      labourCardNo: 'LC',
    });
    PayrollWpsEmployeeLine.create.mockResolvedValue({});
    const result = await generateWpsBatch({ companyId: 1, payrollRunId: 1, userId: 9 });
    expect(result.batch.id).toBe(10);
    expect(PayrollWpsEmployeeLine.create).toHaveBeenCalled();
  });
});
