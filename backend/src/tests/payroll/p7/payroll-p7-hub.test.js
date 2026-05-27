jest.mock('../../../models', () => ({
  PayrollPayslip: { count: jest.fn(), findAll: jest.fn() },
  PayrollExport: { count: jest.fn() },
  PayrollFinalSettlement: { count: jest.fn() },
}));

const { PayrollPayslip, PayrollExport, PayrollFinalSettlement } = require('../../../models');
const { getDashboard } = require('../../../services/payroll/payrollDocumentsHub.service');

describe('payrollDocumentsHub', () => {
  beforeEach(() => {
    PayrollPayslip.count.mockResolvedValue(5);
    PayrollExport.count.mockResolvedValue(3);
    PayrollFinalSettlement.count.mockResolvedValue(2);
  });

  test('dashboard returns counts', async () => {
    const d = await getDashboard(1);
    expect(d.generated_payslips).toBeDefined();
    expect(d.exports_generated).toBe(3);
  });
});
