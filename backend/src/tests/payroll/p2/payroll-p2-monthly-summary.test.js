const {
  buildEmployeeSummary,
  monthBounds,
} = require('../../../services/payroll/payrollMonthlySummaryService');

describe('payrollMonthlySummaryService', () => {
  test('monthBounds returns correct range', () => {
    const b = monthBounds(2026, 6);
    expect(b.fromDate).toBe('2026-06-01');
    expect(b.toDate).toBe('2026-06-30');
    expect(b.calendarDays).toBe(30);
  });

  test('buildEmployeeSummary calculates factual payable_days', () => {
    const employee = { id: 1, employeeNo: 'E1', employeeName: 'Test', departmentId: 1, workforceGroupId: 1 };
    const rows = [
      { attendanceStatus: 'PRESENT', overtimeHours: 2, lateMinutes: 10, earlyLeaveMinutes: 0 },
      { attendanceStatus: 'PRESENT', overtimeHours: 0, lateMinutes: 0, earlyLeaveMinutes: 5 },
      { attendanceStatus: 'ON_LEAVE', overtimeHours: 0, lateMinutes: 0, earlyLeaveMinutes: 0 },
      { attendanceStatus: 'HOLIDAY', overtimeHours: 0, lateMinutes: 0, earlyLeaveMinutes: 0 },
      { attendanceStatus: 'WEEK_OFF', overtimeHours: 0, lateMinutes: 0, earlyLeaveMinutes: 0 },
      { attendanceStatus: 'ABSENT', overtimeHours: 0, lateMinutes: 0, earlyLeaveMinutes: 0 },
    ];
    const s = buildEmployeeSummary(employee, rows, 30);
    expect(s.present_days).toBe(2);
    expect(s.paid_leave_days).toBe(1);
    expect(s.holiday_days).toBe(1);
    expect(s.week_off_days).toBe(1);
    expect(s.absent_days).toBe(1);
    expect(s.payable_days).toBe(4);
    expect(s.overtime_hours).toBe(2);
    expect(s.late_minutes).toBe(10);
  });

  test('payable_days does not include unpaid leave', () => {
    const employee = { id: 1, employeeNo: 'E1', employeeName: 'Test' };
    const rows = [
      { attendanceStatus: 'UNPAID_LEAVE', overtimeHours: 0, lateMinutes: 0, earlyLeaveMinutes: 0 },
      { attendanceStatus: 'PRESENT', overtimeHours: 0, lateMinutes: 0, earlyLeaveMinutes: 0 },
    ];
    const s = buildEmployeeSummary(employee, rows, 30);
    expect(s.unpaid_leave_days).toBe(1);
    expect(s.payable_days).toBe(1);
  });
});
