jest.mock('../../../models', () => ({
  PayrollLeaveApplication: { findOne: jest.fn() },
  PayrollLeaveOpeningBalance: { findOne: jest.fn() },
  LeaveType: { findByPk: jest.fn() },
  Employee: {},
}));

const { PayrollLeaveApplication, PayrollLeaveOpeningBalance, LeaveType } = require('../../../models');
const {
  assertNoLeaveOverlap,
  validateLeaveApplication,
} = require('../../../services/payroll/payrollLeaveBalanceService');

describe('leave application validation', () => {
  afterEach(() => jest.clearAllMocks());

  test('assertNoLeaveOverlap throws when overlap exists', async () => {
    PayrollLeaveApplication.findOne.mockResolvedValue({ id: 1 });
    await expect(assertNoLeaveOverlap(1, 2, '2026-06-01', '2026-06-05')).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('unpaid leave allowed without balance', async () => {
    PayrollLeaveApplication.findOne.mockResolvedValue(null);
    LeaveType.findByPk = jest.fn();
    const leaveType = { id: 1, isPaid: false, allowNegativeBalance: false };
    const employee = { id: 2, status: 'active', joiningDate: '2020-01-01' };
    const days = await validateLeaveApplication({
      companyId: 1,
      employee,
      leaveType,
      body: { from_date: '2026-06-10', to_date: '2026-06-10', half_day: false },
    });
    expect(days).toBe(1);
    expect(PayrollLeaveOpeningBalance.findOne).not.toHaveBeenCalled();
  });

  test('paid leave requires balance', async () => {
    PayrollLeaveApplication.findOne.mockResolvedValue(null);
    PayrollLeaveOpeningBalance.findOne.mockResolvedValue(null);
    const leaveType = { id: 1, isPaid: true, allowNegativeBalance: false };
    const employee = { id: 2, status: 'active', joiningDate: '2020-01-01' };
    await expect(
      validateLeaveApplication({
        companyId: 1,
        employee,
        leaveType,
        body: { from_date: '2026-06-10', to_date: '2026-06-10' },
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});
