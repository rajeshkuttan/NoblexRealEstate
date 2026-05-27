jest.mock('../../../models', () => ({
  PayrollRun: {},
  PayrollPeriod: {},
  PayrollRunEmployee: { findOne: jest.fn() },
  PayrollRunComponentLine: {},
  PayrollComponent: {},
  PayrollPayslip: { findOne: jest.fn(), create: jest.fn(), update: jest.fn() },
  PayrollBatchJob: { create: jest.fn(), update: jest.fn() },
}));

jest.mock('../../../services/payroll/payrollDocumentRender.service', () => ({
  renderAndSavePdf: jest.fn().mockResolvedValue({ relativePath: '/uploads/payroll/documents/1/test.pdf' }),
  maskIban: jest.fn(),
}));

const { PayrollRunEmployee, PayrollPayslip } = require('../../../models');
const { generatePayslip } = require('../../../services/payroll/payrollPayslip.service');

describe('payrollPayslip.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('blocks unlocked run', async () => {
    PayrollRunEmployee.findOne.mockResolvedValue({
      id: 1,
      employeeId: 5,
      grossSalary: 1000,
      deductions: 0,
      netSalary: 1000,
      salaryStructureSnapshot: {},
      lines: [],
      payrollRun: { id: 10, status: 'APPROVED', runNumber: 'R1', payrollPeriod: {} },
    });
    await expect(generatePayslip({ req: { companyId: 1, user: { id: 2 } }, payrollRunEmployeeId: 1 })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('generates payslip for locked run', async () => {
    PayrollRunEmployee.findOne.mockResolvedValue({
      id: 1,
      employeeId: 5,
      grossSalary: 10000,
      deductions: 1000,
      netSalary: 9000,
      salaryStructureSnapshot: { employeeName: 'Test' },
      lines: [],
      payrollRun: { id: 10, status: 'LOCKED', runNumber: 'R1', payrollPeriodId: 3, payrollPeriod: {} },
      update: jest.fn(),
    });
    PayrollPayslip.findOne.mockResolvedValue(null);
    PayrollPayslip.create.mockResolvedValue({ id: 99, payslipNumber: 'PS-10-5', status: 'GENERATED' });

    const result = await generatePayslip({ req: { companyId: 1, user: { id: 2 } }, payrollRunEmployeeId: 1 });
    expect(PayrollPayslip.create).toHaveBeenCalled();
    expect(result.status).toBe('GENERATED');
  });

  test('blocks regenerate published', async () => {
    PayrollRunEmployee.findOne.mockResolvedValue({
      id: 1,
      lines: [],
      payrollRun: { status: 'LOCKED', payrollPeriod: {} },
    });
    PayrollPayslip.findOne.mockResolvedValue({ status: 'PUBLISHED' });
    await expect(generatePayslip({ req: { companyId: 1 }, payrollRunEmployeeId: 1 })).rejects.toThrow(/Published/);
  });
});
