jest.mock('../../../models', () => ({
  PayrollPayslip: { findOne: jest.fn(), update: jest.fn() },
}));

const { PayrollPayslip } = require('../../../models');
const { voidPayslip } = require('../../../services/payroll/payrollPayslip.service');

describe('voidPayslip', () => {
  test('voids generated payslip', async () => {
    const update = jest.fn();
    PayrollPayslip.findOne.mockResolvedValue({ id: 1, status: 'GENERATED', update });
    await voidPayslip({ req: { companyId: 1 }, payslipId: 1 });
    expect(update).toHaveBeenCalledWith({ status: 'VOID' });
  });

  test('blocks void published without permission', async () => {
    PayrollPayslip.findOne.mockResolvedValue({ id: 1, status: 'PUBLISHED', update: jest.fn() });
    await expect(voidPayslip({ req: { companyId: 1 }, payslipId: 1 })).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  test('allows void published with allowPublished', async () => {
    const update = jest.fn();
    PayrollPayslip.findOne.mockResolvedValue({ id: 1, status: 'PUBLISHED', update });
    await voidPayslip({ req: { companyId: 1 }, payslipId: 1, allowPublished: true });
    expect(update).toHaveBeenCalled();
  });
});
