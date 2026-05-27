jest.mock('../../../services/payroll/payrollPayslip.service', () => ({
  generatePayslip: jest.fn(),
  listPayslips: jest.fn(),
  generateBatchPayslips: jest.fn(),
}));

jest.mock('../../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn(),
  COMPANY_AUDIT_ACTIONS: { PAYSLIP_GENERATED: 'PAYSLIP_GENERATED' },
}));

const ctrl = require('../../../controllers/payrollPayslipController');
const { generatePayslip } = require('../../../services/payroll/payrollPayslip.service');

describe('payrollPayslipController', () => {
  test('generate requires payroll_run_employee_id', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    await ctrl.generate({ companyId: 1, body: {} }, { status, json }, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
  });

  test('generate calls service', async () => {
    generatePayslip.mockResolvedValue({ id: 1, payslipNumber: 'PS-1-1' });
    const json = jest.fn();
    await ctrl.generate(
      { companyId: 1, user: { id: 2 }, body: { payroll_run_employee_id: 5 } },
      { json },
      jest.fn()
    );
    expect(generatePayslip).toHaveBeenCalled();
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
