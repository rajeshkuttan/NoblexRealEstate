const { LOCKED_MESSAGE, AttendancePeriodLockedError } = require('../../../services/payroll/payrollAttendancePeriodGuard');

jest.mock('../../../models', () => ({
  PayrollAttendancePeriod: { findOne: jest.fn() },
}));

const { PayrollAttendancePeriod } = require('../../../models');
const { assertPeriodNotLocked, isPeriodLocked } = require('../../../services/payroll/payrollAttendancePeriodGuard');

describe('payrollAttendancePeriodGuard', () => {
  afterEach(() => jest.clearAllMocks());

  test('LOCKED_MESSAGE is exact spec text', () => {
    expect(LOCKED_MESSAGE).toBe('Attendance period is locked');
  });

  test('assertPeriodNotLocked throws when LOCKED', async () => {
    PayrollAttendancePeriod.findOne.mockResolvedValue({ status: 'LOCKED' });
    await expect(assertPeriodNotLocked(1, '2026-06-15')).rejects.toBeInstanceOf(AttendancePeriodLockedError);
  });

  test('assertPeriodNotLocked passes when no period', async () => {
    PayrollAttendancePeriod.findOne.mockResolvedValue(null);
    await expect(assertPeriodNotLocked(1, '2026-06-15')).resolves.toBeNull();
  });

  test('isPeriodLocked returns true for LOCKED', async () => {
    PayrollAttendancePeriod.findOne.mockResolvedValue({ status: 'LOCKED' });
    expect(await isPeriodLocked(1, 6, 2026)).toBe(true);
  });
});
