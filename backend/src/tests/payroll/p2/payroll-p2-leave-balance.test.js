const {
  daysBetween,
  datesOverlap,
  approveOpeningBalance,
} = require('../../../services/payroll/payrollLeaveBalanceService');

describe('payrollLeaveBalanceService', () => {
  test('daysBetween full days', () => {
    expect(daysBetween('2026-06-01', '2026-06-03', false)).toBe(3);
  });

  test('daysBetween half day single day', () => {
    expect(daysBetween('2026-06-01', '2026-06-01', true)).toBe(0.5);
  });

  test('datesOverlap detects overlap', () => {
    expect(datesOverlap('2026-06-01', '2026-06-05', '2026-06-03', '2026-06-10')).toBe(true);
  });

  test('datesOverlap no overlap', () => {
    expect(datesOverlap('2026-06-01', '2026-06-02', '2026-06-05', '2026-06-10')).toBe(false);
  });

  test('approveOpeningBalance sets APPROVED', async () => {
    const record = {
      status: 'DRAFT',
      openingDays: 10,
      adjustedDays: 0,
      usedDays: 2,
      update: jest.fn().mockImplementation(function (data) {
        Object.assign(this, data);
        return this;
      }),
    };
    await approveOpeningBalance(record, 99);
    expect(record.status).toBe('APPROVED');
    expect(record.approvedBy).toBe(99);
    expect(Number(record.availableDays)).toBe(8);
  });

  test('approveOpeningBalance rejects LOCKED', async () => {
    const record = { status: 'LOCKED', update: jest.fn() };
    await expect(approveOpeningBalance(record, 1)).rejects.toMatchObject({ statusCode: 400 });
  });
});
