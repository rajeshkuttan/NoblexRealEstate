jest.mock('../../../models', () => ({
  PayrollAttendancePeriod: { findOne: jest.fn() },
  PayrollPeriod: { findOne: jest.fn(), create: jest.fn() },
}));

const { PayrollAttendancePeriod } = require('../../../models');
const { assertAttendanceReady } = require('../../../services/payroll/payrollPeriodService');

describe('payrollPeriodService', () => {
  afterEach(() => jest.clearAllMocks());

  test('rejects when attendance not approved', async () => {
    PayrollAttendancePeriod.findOne.mockResolvedValue({ status: 'GENERATED' });
    await expect(assertAttendanceReady(1, 6, 2026)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('allows APPROVED attendance', async () => {
    PayrollAttendancePeriod.findOne.mockResolvedValue({ status: 'APPROVED', id: 5 });
    const att = await assertAttendanceReady(1, 6, 2026);
    expect(att.status).toBe('APPROVED');
  });

  test('allows LOCKED attendance', async () => {
    PayrollAttendancePeriod.findOne.mockResolvedValue({ status: 'LOCKED', id: 5 });
    const att = await assertAttendanceReady(1, 6, 2026);
    expect(att.status).toBe('LOCKED');
  });
});
