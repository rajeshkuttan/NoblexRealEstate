'use strict';

const Decimal = require('decimal.js');
const calc = require('../../services/leaseRevenue/leaseRevenueCalculation.service');

const mockDestroy = jest.fn().mockResolvedValue(undefined);
const mockCreate = jest.fn().mockImplementation((data) => Promise.resolve({ id: data.lineNumber, ...data }));
const mockFindAll = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue(undefined);
const mockVersionCreate = jest.fn().mockResolvedValue({});

jest.mock('../../models', () => ({
  LeaseRevenueScheduleLine: {
    findAll: (...args) => mockFindAll(...args),
    destroy: (...args) => mockDestroy(...args),
    create: (...args) => mockCreate(...args),
  },
  LeaseRevenueVersion: {
    create: (...args) => mockVersionCreate(...args),
  },
  sequelize: {},
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  withCompanyId: (_req, data) => ({ companyId: 1, ...data }),
}));

const scheduleService = require('../../services/leaseRevenue/leaseRevenueSchedule.service');
const { hasLockedScheduleLines } = require('../../services/leaseRevenue/leaseRevenueValidation.service');

const req = { companyId: 1, user: { id: 1 } };
const tx = {};

function sumAmounts(schedule) {
  return schedule.reduce((s, l) => s.plus(l.scheduledAmount || 0), new Decimal(0)).toNumber();
}

describe('leaseRevenueSchedule.service — canRegenerateSchedule', () => {
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

describe('leaseRevenueSchedule.service — equal monthly calculation cases', () => {
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

describe('leaseRevenueSchedule.service — persistScheduleLines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws when locked lines exist', async () => {
    mockFindAll.mockResolvedValue([{ postingStatus: 'POSTED', isLocked: true }]);
    const schedule = { id: 10, totalContractAmount: '120000' };
    const rows = calc.calculateMonthlySchedule('120000', '2026-01-15', '2027-01-14', 2);
    await expect(scheduleService.persistScheduleLines(req, schedule, rows, tx)).rejects.toThrow(
      /locked or posted lines/
    );
  });

  test('destroys existing and creates new lines', async () => {
    mockFindAll.mockResolvedValue([]);
    const schedule = { id: 10, totalContractAmount: '3000' };
    const rows = calc.calculateMonthlySchedule('3000', '2026-01-01', '2026-03-31', 2);
    const created = await scheduleService.persistScheduleLines(req, schedule, rows, tx);
    expect(mockDestroy).toHaveBeenCalled();
    expect(mockCreate).toHaveBeenCalledTimes(rows.length);
    expect(created).toHaveLength(rows.length);
    expect(created[0].postingStatus).toBe('SCHEDULED');
  });

  test('sets cumulative and remaining balances on lines', async () => {
    mockFindAll.mockResolvedValue([]);
    const schedule = { id: 10, totalContractAmount: '1000' };
    const rows = calc.calculateMonthlySchedule('1000', '2026-01-01', '2026-01-31', 2);
    await scheduleService.persistScheduleLines(req, schedule, rows, tx);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        cumulativeAmount: expect.any(String),
        remainingBalance: expect.any(String),
      }),
      expect.any(Object)
    );
  });
});

describe('leaseRevenueSchedule.service — generateAndPersistSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindAll.mockResolvedValue([]);
  });

  test('updates schedule totals and persists schedule', async () => {
    const schedule = {
      id: 5,
      totalContractAmount: '120000',
      serviceStartDate: '2026-01-15',
      serviceEndDate: '2027-01-14',
      status: 'DRAFT',
      update: mockUpdate,
    };
    const result = await scheduleService.generateAndPersistSchedule(req, schedule, tx);
    expect(result.schedule).toHaveLength(13);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        totalServiceDays: 365,
        scheduleStatus: 'GENERATED',
        status: 'SCHEDULE_GENERATED',
        deferredBalance: '120000',
      }),
      { transaction: tx }
    );
  });

  test('preserves non-DRAFT status on regenerate', async () => {
    const schedule = {
      id: 5,
      totalContractAmount: '1000',
      serviceStartDate: '2026-01-01',
      serviceEndDate: '2026-01-31',
      status: 'SCHEDULE_GENERATED',
      update: mockUpdate,
    };
    await scheduleService.generateAndPersistSchedule(req, schedule, tx);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SCHEDULE_GENERATED' }),
      expect.any(Object)
    );
  });
});

describe('leaseRevenueSchedule.service — saveVersionSnapshot', () => {
  test('creates version and increments version number', async () => {
    mockFindAll.mockResolvedValue([{ lineNumber: 1 }]);
    const schedule = {
      id: 1,
      versionNumber: 2,
      toJSON: () => ({ id: 1 }),
      update: mockUpdate,
    };
    const next = await scheduleService.saveVersionSnapshot(req, schedule, 'Test', tx);
    expect(next).toBe(3);
    expect(mockVersionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ versionNumber: 2, reason: 'Test' }),
      expect.any(Object)
    );
  });
});

describe('leaseRevenueSchedule.service — regenerateSchedule', () => {
  test('throws when cannot regenerate', async () => {
    mockFindAll.mockResolvedValue([]);
    const schedule = {
      id: 1,
      status: 'ACTIVE',
      totalContractAmount: '1000',
      serviceStartDate: '2026-01-01',
      serviceEndDate: '2026-01-31',
      update: mockUpdate,
    };
    await expect(scheduleService.regenerateSchedule(req, schedule, tx)).rejects.toThrow(
      /cannot be regenerated/
    );
  });
});

describe('leaseRevenueSchedule.service — regenerateFutureLinesOnly', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('keeps locked lines and creates tail for remaining amount', async () => {
    const locked = [{ id: 1, postingStatus: 'POSTED', isLocked: false, scheduledAmount: '3000' }];
    const unposted = [{ id: 2, postingStatus: 'SCHEDULED', isLocked: false, scheduledAmount: '9000' }];
    mockFindAll.mockResolvedValue([...locked, ...unposted]);

    const schedule = { id: 10, totalContractAmount: '12000', versionNumber: 1 };
    const lines = await scheduleService.regenerateFutureLinesOnly(
      req,
      schedule,
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
    const schedule = { id: 10, totalContractAmount: '5000' };
    const lines = await scheduleService.regenerateFutureLinesOnly(
      req,
      schedule,
      '2026-02-01',
      '2026-03-31',
      '5000',
      tx
    );
    expect(lines).toHaveLength(1);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
