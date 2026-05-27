const p2 = require('../../../models/payrollP2Models');

describe('P2 models export', () => {
  const expected = [
    'PayrollLeaveOpeningBalance',
    'PayrollLeaveApplication',
    'PayrollAttendanceLog',
    'PayrollAttendanceDailySummary',
    'PayrollLabourTimesheet',
    'PayrollLabourTimesheetLine',
    'PayrollOvertimeRequest',
    'PayrollAttendancePeriod',
  ];

  test.each(expected)('%s is exported from payrollP2Models', (name) => {
    expect(p2[name]).toBeDefined();
    expect(p2[name].tableName).toBeTruthy();
  });
});
