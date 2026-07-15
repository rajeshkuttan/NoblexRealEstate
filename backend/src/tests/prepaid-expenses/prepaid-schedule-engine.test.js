'use strict';

const Decimal = require('decimal.js');
const calc = require('../../services/prepaidExpenses/prepaidCalculation.service');

const mockDestroy = jest.fn().mockResolvedValue(undefined);
const mockCreate = jest.fn().mockImplementation((data) => Promise.resolve({ id: data.lineNumber, ...data }));
const mockFindAll = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue(undefined);

jest.mock('../../models', () => ({
  PrepaidExpenseScheduleLine: {
    findAll: (...args) => mockFindAll(...args),
    destroy: (...args) => mockDestroy(...args),
    create: (...args) => mockCreate(...args),
  },
  sequelize: {},
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  withCompanyId: (_req, data) => ({ companyId: 1, ...data }),
}));

const scheduleService = require('../../services/prepaidExpenses/prepaidSchedule.service');
const { hasLockedScheduleLines } = require('../../services/prepaidExpenses/prepaidValidation.service');

const req = { companyId: 1 };
const tx = {};

function sumAmounts(schedule) {
  return schedule.reduce((s, l) => s.plus(l.scheduledAmount || 0), new Decimal(0)).toNumber();
}

describe('prepaidSchedule.service — canRegenerateSchedule', () => {
  test('allows DRAFT with no locked lines', () => {
    expect(scheduleService.canRegenerateSchedule({ status: 'DRAFT' }, [])).toBe(true);
  });

  test('allows SCHEDULE_GENERATED with no locked lines', () => {
    expect(scheduleService.canRegenerateSchedule({ status: 'SCHEDULE_GENERATED' }, [])).toBe(true);
  });

  test('blocks ACTIVE status', () => {
    expect(scheduleService.canRegenerateSchedule({ status: 'ACTIVE' }, [])).toBe(false);
  });

  test('blocks when locked lines exist', () => {
    expect(
      scheduleService.canRegenerateSchedule({ status: 'DRAFT' }, [{ postingStatus: 'POSTED' }])
    ).toBe(false);
  });

  test('blocks SUBMITTED status', () => {
    expect(scheduleService.canRegenerateSchedule({ status: 'SUBMITTED' }, [])).toBe(false);
  });
});

describe('prepaidSchedule.service — equal monthly calculation cases', () => {
  test('equal monthly splits 12000 across 4 months', () => {
    const schedule = calc.equalMonthlySchedule('12000', '2026-01-15', '2026-04-14', 2);
    expect(schedule).toHaveLength(4);
    expect(sumAmounts(schedule)).toBe(12000);
  });

  test('equal monthly single month equals total', () => {
    const schedule = calc.equalMonthlySchedule('5000', '2026-05-01', '2026-05-31', 2);
    expect(schedule).toHaveLength(1);
    expect(parseFloat(schedule[0].scheduledAmount)).toBe(5000);
  });

  test('equal monthly final line absorbs rounding', () => {
    const schedule = calc.equalMonthlySchedule('100', '2026-01-01', '2026-01-03', 2);
    expect(sumAmounts(schedule)).toBe(100);
    expect(schedule[schedule.length - 1].isFinalAdjustment).toBeDefined();
  });
});

describe('prepaidSchedule.service — persistScheduleLines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws when locked lines exist', async () => {
    mockFindAll.mockResolvedValue([{ postingStatus: 'POSTED', isLocked: true }]);
    const expense = { id: 10, totalAmount: '120000' };
    const rows = calc.calculateMonthlySchedule('120000', '2026-01-15', '2027-01-14', 2);
    await expect(scheduleService.persistScheduleLines(req, expense, rows, tx)).rejects.toThrow(
      /locked or posted lines/
    );
  });

  test('destroys existing and creates new lines', async () => {
    mockFindAll.mockResolvedValue([]);
    const expense = { id: 10, totalAmount: '3000' };
    const rows = calc.calculateMonthlySchedule('3000', '2026-01-01', '2026-03-31', 2);
    const created = await scheduleService.persistScheduleLines(req, expense, rows, tx);
    expect(mockDestroy).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(rows.length);
    expect(created).toHaveLength(rows.length);
    expect(created[0].postingStatus).toBe('SCHEDULED');
  });
});

describe('prepaidSchedule.service — generateAndPersistSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue([]);
  });

  test('updates expense totals and persists schedule', async () => {
    const expense = {
      id: 5,
      totalAmount: '120000',
      serviceStartDate: '2026-01-15',
      serviceEndDate: '2027-01-14',
      status: 'DRAFT',
      update: mockUpdate,
    };
    const result = await scheduleService.generateAndPersistSchedule(req, expense, tx);
    expect(result.schedule).toHaveLength(13);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        totalServiceDays: 365,
        scheduleStatus: 'GENERATED',
        status: 'SCHEDULE_GENERATED',
      }),
      { transaction: tx }
    );
  });
});

describe('prepaidSchedule.service — regenerateSchedule', () => {
  test('throws when cannot regenerate', async () => {
    mockFindAll.mockResolvedValue([]);
    const expense = { id: 1, status: 'ACTIVE', totalAmount: '1000', serviceStartDate: '2026-01-01', serviceEndDate: '2026-01-31', update: mockUpdate };
    await expect(scheduleService.regenerateSchedule(req, expense, tx)).rejects.toThrow(
      /cannot be regenerated/
    );
  });
});

describe('prepaidSchedule.service — regenerateFutureLinesOnly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps locked lines and creates tail for remaining amount', async () => {
    const locked = [
      { id: 1, postingStatus: 'POSTED', isLocked: false, scheduledAmount: '3000' },
    ];
    const unposted = [{ id: 2, postingStatus: 'SCHEDULED', isLocked: false, scheduledAmount: '9000' }];
    mockFindAll.mockResolvedValue([...locked, ...unposted]);

    const expense = { id: 10, totalAmount: '12000' };
    const lines = await scheduleService.regenerateFutureLinesOnly(
      req,
      expense,
      '2026-04-01',
      '2026-06-30',
      '12000',
      tx
    );

    expect(mockDestroy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: [2] }) })
    );
    expect(lines.length).toBeGreaterThan(locked.length);
    expect(hasLockedScheduleLines(locked)).toBe(true);
  });

  test('returns only locked when remaining amount is zero', async () => {
    const locked = [{ id: 1, postingStatus: 'POSTED', isLocked: false, scheduledAmount: '5000' }];
    mockFindAll.mockResolvedValue(locked);
    const expense = { id: 10, totalAmount: '5000' };
    const lines = await scheduleService.regenerateFutureLinesOnly(
      req,
      expense,
      '2026-02-01',
      '2026-03-31',
      '5000',
      tx
    );
    expect(lines).toHaveLength(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
