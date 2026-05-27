jest.mock('../../../models', () => ({
  Employee: { findAll: jest.fn() },
  PayrollLeaveApplication: { count: jest.fn() },
  PayrollOvertimeRequest: { count: jest.fn() },
  PayrollLabourTimesheet: { count: jest.fn() },
  PayrollAttendancePeriod: { findOne: jest.fn() },
  PayrollAttendanceDailySummary: { count: jest.fn() },
}));

const {
  Employee,
  PayrollLeaveApplication,
  PayrollOvertimeRequest,
  PayrollLabourTimesheet,
  PayrollAttendancePeriod,
  PayrollAttendanceDailySummary,
} = require('../../../models');
const { getPayrollReadiness } = require('../../../services/payroll/payrollReadinessService');

describe('payrollReadinessService', () => {
  afterEach(() => jest.clearAllMocks());

  test('detects blockers when pending leave', async () => {
    Employee.findAll.mockResolvedValue([{ id: 1 }]);
    PayrollLeaveApplication.count.mockResolvedValue(2);
    PayrollOvertimeRequest.count.mockResolvedValue(0);
    PayrollLabourTimesheet.count.mockResolvedValue(0);
    PayrollAttendancePeriod.findOne.mockResolvedValue({ status: 'APPROVED', fromDate: '2026-06-01', toDate: '2026-06-30' });
    PayrollAttendanceDailySummary.count.mockResolvedValue(30);

    const r = await getPayrollReadiness(1, 6, 2026);
    expect(r.pending_leave_approvals).toBe(2);
    expect(r.blocking_issues.some((b) => b.includes('leave'))).toBe(true);
    expect(r.ready_for_payroll).toBe(false);
  });

  test('ready when no blockers and period APPROVED', async () => {
    Employee.findAll.mockResolvedValue([]);
    PayrollLeaveApplication.count.mockResolvedValue(0);
    PayrollOvertimeRequest.count.mockResolvedValue(0);
    PayrollLabourTimesheet.count.mockResolvedValue(0);
    PayrollAttendancePeriod.findOne.mockResolvedValue({
      id: 1,
      status: 'APPROVED',
      fromDate: '2026-06-01',
      toDate: '2026-06-30',
    });

    const r = await getPayrollReadiness(1, 6, 2026);
    expect(r.ready_for_payroll).toBe(true);
    expect(r.blocking_issues).toHaveLength(0);
  });
});
