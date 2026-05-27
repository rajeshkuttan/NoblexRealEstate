jest.mock('../../../models', () => ({
  PayrollLeaveOpeningBalance: { findAll: jest.fn() },
  LeaveType: {},
}));

const { PayrollLeaveOpeningBalance } = require('../../../models');
const { calculateLeaveEncashment } = require('../../../services/payroll/payrollLeaveSettlementService');

describe('calculateLeaveEncashment', () => {
  test('encashment from available days', async () => {
    PayrollLeaveOpeningBalance.findAll.mockResolvedValue([
      {
        leaveTypeId: 1,
        availableDays: 10,
        leaveType: { isPaid: true, leaveCode: 'ANNUAL', leaveName: 'Annual Leave' },
      },
    ]);
    const r = await calculateLeaveEncashment({
      companyId: 1,
      employeeId: 1,
      salaryStructure: { lines: [{ amount: 6000, component: { componentCode: 'BASIC' } }] },
      lastWorkingDay: '2026-06-30',
    });
    expect(r.encashableDays).toBe(10);
    expect(r.amount).toBe(2000);
  });
});
