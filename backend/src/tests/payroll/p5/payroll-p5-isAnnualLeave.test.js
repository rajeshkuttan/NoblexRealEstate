const { isAnnualLeaveType } = require('../../../services/payroll/payrollLeaveSettlementService');

describe('isAnnualLeaveType', () => {
  test('matches ANNUAL code', () => {
    expect(isAnnualLeaveType({ leaveCode: 'ANNUAL_LEAVE' })).toBe(true);
  });
  test('matches annual name', () => {
    expect(isAnnualLeaveType({ leaveName: 'Annual Leave' })).toBe(true);
  });
  test('rejects sick', () => {
    expect(isAnnualLeaveType({ leaveCode: 'SICK', leaveName: 'Sick Leave' })).toBe(false);
  });
});
