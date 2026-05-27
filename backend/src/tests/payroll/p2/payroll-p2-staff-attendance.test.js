const { STAFF_GROUP_CODES, parseWorkDays } = require('../../../services/payroll/payrollStaffAttendanceService');

describe('payrollStaffAttendanceService helpers', () => {
  test('STAFF_GROUP_CODES includes Staff and Management', () => {
    expect(STAFF_GROUP_CODES).toContain('STAFF');
    expect(STAFF_GROUP_CODES).toContain('MANAGEMENT');
  });

  test('parseWorkDays mon-fri', () => {
    const days = parseWorkDays('mon,tue,wed,thu,fri');
    expect(days).toContain(1);
    expect(days).toContain(5);
    expect(days).not.toContain(0);
  });
});
