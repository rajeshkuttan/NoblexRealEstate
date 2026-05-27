jest.mock('../../../models', () => ({
  PayrollRun: { findOne: jest.fn() },
  PayrollRunEmployee: { findAll: jest.fn(), findOne: jest.fn() },
  PayrollRunComponentLine: {},
  PayrollComponent: {},
  PayrollPeriod: {},
  PayrollPayslip: { findOne: jest.fn(), create: jest.fn() },
  PayrollBatchJob: { create: jest.fn(), update: jest.fn() },
}));

jest.mock('../../../services/payroll/payrollDocumentRender.service', () => ({
  renderAndSavePdf: jest.fn().mockResolvedValue({ relativePath: '/uploads/payroll/documents/1/x.pdf' }),
}));

const { PayrollRun, PayrollRunEmployee, PayrollBatchJob } = require('../../../models');
const { generateBatchPayslips } = require('../../../services/payroll/payrollPayslip.service');

describe('batch payslip generation', () => {
  test('creates batch job and processes employees', async () => {
    PayrollRun.findOne.mockResolvedValue({ id: 10, status: 'LOCKED' });
    PayrollRunEmployee.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    PayrollBatchJob.create.mockResolvedValue({ id: 1, update: jest.fn() });
    const update = jest.fn();
    PayrollBatchJob.create.mockResolvedValue({ id: 1, update });

    PayrollRunEmployee.findOne.mockResolvedValue({
      id: 1,
      employeeId: 5,
      grossSalary: 100,
      deductions: 0,
      netSalary: 100,
      salaryStructureSnapshot: {},
      lines: [],
      payrollRun: { id: 10, status: 'LOCKED', payrollPeriod: {} },
    });
    const { PayrollPayslip } = require('../../../models');
    PayrollPayslip.findOne.mockResolvedValue(null);
    PayrollPayslip.create.mockResolvedValue({ id: 1 });

    const job = await generateBatchPayslips({ req: { companyId: 1, user: { id: 1 } }, payrollRunId: 10 });
    expect(PayrollBatchJob.create).toHaveBeenCalledWith(
      expect.objectContaining({ jobType: 'PAYSLIP_BATCH', total: 2 })
    );
    expect(job).toBeDefined();
  });
});
