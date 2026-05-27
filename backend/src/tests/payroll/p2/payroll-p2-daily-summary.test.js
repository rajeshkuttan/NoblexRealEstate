jest.mock('../../../models', () => ({
  PayrollAttendanceDailySummary: {
    findOrCreate: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  },
}));

const { PayrollAttendanceDailySummary } = require('../../../models');
const { upsertDailySummary, applyOvertimeApproval } = require('../../../services/payroll/payrollDailySummaryService');

describe('payrollDailySummaryService', () => {
  afterEach(() => jest.clearAllMocks());

  test('upsertDailySummary creates row', async () => {
    const row = { locked: false, update: jest.fn().mockResolvedValue(true) };
    PayrollAttendanceDailySummary.findOrCreate.mockResolvedValue([row, true]);
    await upsertDailySummary(1, 2, '2026-06-01', { attendanceStatus: 'PRESENT' });
    expect(row.update).toHaveBeenCalled();
  });

  test('upsertDailySummary rejects locked row', async () => {
    const row = { locked: true, update: jest.fn() };
    PayrollAttendanceDailySummary.findOrCreate.mockResolvedValue([row, false]);
    await expect(upsertDailySummary(1, 2, '2026-06-01', {})).rejects.toMatchObject({ statusCode: 400 });
  });

  test('applyOvertimeApproval updates overtime hours', async () => {
    const row = { locked: false, update: jest.fn().mockResolvedValue(true) };
    PayrollAttendanceDailySummary.findOne.mockResolvedValue(row);
    await applyOvertimeApproval(1, {
      employeeId: 2,
      workDate: '2026-06-01',
      approvedHours: 3,
    });
    expect(row.update).toHaveBeenCalledWith(expect.objectContaining({ overtimeHours: 3 }));
  });
});
