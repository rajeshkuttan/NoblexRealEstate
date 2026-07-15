'use strict';

const mockScheduleFindOne = jest.fn();
const mockLineFindAll = jest.fn();
const mockLineDestroy = jest.fn();
const mockLineCreate = jest.fn();
const mockCreatePostedJv = jest.fn();
const mockSaveVersion = jest.fn();

jest.mock('../../models', () => ({
  LeaseRevenueSchedule: {},
  LeaseRevenueScheduleLine: {
    findAll: (...a) => mockLineFindAll(...a),
    destroy: (...a) => mockLineDestroy(...a),
    create: (...a) => mockLineCreate(...a),
  },
  sequelize: {
    transaction: jest.fn((fn) => fn({})),
  },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  withCompanyId: (_req, data) => ({ companyId: 1, ...data }),
  assertRecordInCompany: jest.fn(() => mockScheduleFindOne()),
}));

jest.mock('../../services/systemJournalVoucher.service', () => ({
  createPostedSystemJournalVoucher: (...a) => mockCreatePostedJv(...a),
}));

jest.mock('../../services/leaseRevenue/leaseRevenueSchedule.service', () => ({
  saveVersionSnapshot: (...a) => mockSaveVersion(...a),
}));

const termination = require('../../services/leaseRevenue/leaseRevenueTermination.service');

const req = { companyId: 1, user: { id: 1 } };

function makeSchedule(overrides = {}) {
  return {
    id: 10,
    scheduleNumber: 'LRS-000010',
    status: 'ACTIVE',
    totalContractAmount: '12000',
    recognizedAmount: '6000',
    deferredBalance: '6000',
    serviceStartDate: '2026-01-01',
    serviceEndDate: '2026-12-31',
    revenueAccountId: 4100,
    deferredRevenueAccountId: 2500,
    receivableAccountId: 1100,
    update: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockImplementation(function reload() {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
}

describe('leaseRevenueTermination.service — SETTLEMENT_MODES', () => {
  test('includes all five settlement modes', () => {
    expect(termination.SETTLEMENT_MODES.has('REFUND')).toBe(true);
    expect(termination.SETTLEMENT_MODES.has('CREDIT')).toBe(true);
    expect(termination.SETTLEMENT_MODES.has('TRANSFER')).toBe(true);
    expect(termination.SETTLEMENT_MODES.has('FORFEIT')).toBe(true);
    expect(termination.SETTLEMENT_MODES.has('MIXED')).toBe(true);
  });
});

describe('leaseRevenueTermination.service — buildSettlementJvLines', () => {
  const schedule = makeSchedule();

  test('REFUND credits bank account', () => {
    const lines = termination.buildSettlementJvLines(schedule, 500, 'REFUND', { bankAccountId: 1001 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual(expect.objectContaining({ ledgerId: 2500, debit: 500 }));
    expect(lines[1]).toEqual(expect.objectContaining({ ledgerId: 1001, credit: 500 }));
  });

  test('CREDIT credits receivable account', () => {
    const lines = termination.buildSettlementJvLines(schedule, 300, 'CREDIT', {});
    expect(lines[1]).toEqual(expect.objectContaining({ ledgerId: 1100, credit: 300 }));
  });

  test('TRANSFER credits target account', () => {
    const lines = termination.buildSettlementJvLines(schedule, 200, 'TRANSFER', { transferAccountId: 3000 });
    expect(lines[1]).toEqual(expect.objectContaining({ ledgerId: 3000, credit: 200 }));
  });

  test('FORFEIT credits revenue account', () => {
    const lines = termination.buildSettlementJvLines(schedule, 150, 'FORFEIT', {});
    expect(lines[1]).toEqual(expect.objectContaining({ ledgerId: 4100, credit: 150 }));
  });

  test('MIXED splits across multiple accounts', () => {
    const lines = termination.buildSettlementJvLines(schedule, 400, 'MIXED', {
      settlementSplits: [
        { accountId: 1001, amount: 250 },
        { accountId: 1100, amount: 150 },
      ],
    });
    expect(lines).toHaveLength(3);
    expect(lines.reduce((s, l) => s + l.credit, 0)).toBe(400);
  });

  test('returns empty when amount is zero', () => {
    expect(termination.buildSettlementJvLines(schedule, 0, 'CREDIT', {})).toEqual([]);
  });

  test('returns empty when missing credit leg', () => {
    const noRecv = makeSchedule({ receivableAccountId: null });
    expect(termination.buildSettlementJvLines(noRecv, 100, 'CREDIT', {})).toEqual([]);
  });

  test('returns empty when deferred account missing', () => {
    const noDef = makeSchedule({ deferredRevenueAccountId: null });
    expect(termination.buildSettlementJvLines(noDef, 100, 'CREDIT', {})).toEqual([]);
  });
});

describe('leaseRevenueTermination.service — terminateSchedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveVersion.mockResolvedValue(2);
    mockCreatePostedJv.mockResolvedValue({ voucher: { id: 99, jvNumber: 'LRS-TERM-LRS-000010' } });
    mockLineDestroy.mockResolvedValue(undefined);
    mockLineCreate.mockResolvedValue({});
  });

  test('rejects invalid settlement mode', async () => {
    mockScheduleFindOne.mockResolvedValue(makeSchedule());
    await expect(
      termination.terminateSchedule(req, 10, { settlementMode: 'INVALID' })
    ).rejects.toThrow(/Invalid settlement mode/);
  });

  test('terminates schedule and removes future unposted lines', async () => {
    const schedule = makeSchedule();
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindAll
      .mockResolvedValueOnce([{ id: 5, postingStatus: 'SCHEDULED', periodStartDate: '2026-08-01' }])
      .mockResolvedValueOnce([{ scheduledAmount: '6000', postingStatus: 'POSTED' }]);

    const result = await termination.terminateSchedule(req, 10, {
      effectiveDate: '2026-06-30',
      settlementMode: 'CREDIT',
    });

    expect(mockLineDestroy).toHaveBeenCalled();
    expect(schedule.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'TERMINATED', serviceEndDate: '2026-06-30' }),
      expect.any(Object)
    );
    expect(result.settlementMode).toBe('CREDIT');
    expect(mockSaveVersion).toHaveBeenCalled();
  });

  test('creates settlement JV when deferred balance remains', async () => {
    const schedule = makeSchedule();
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    await termination.terminateSchedule(req, 10, {
      effectiveDate: '2026-06-30',
      settlementMode: 'CREDIT',
      settlementAmount: 6000,
    });

    expect(mockCreatePostedJv).toHaveBeenCalledWith(
      expect.objectContaining({
        jvNumber: 'LRS-TERM-LRS-000010',
        sourceType: 'lease_revenue_termination',
      })
    );
  });

  test('defaults settlement mode to CREDIT', async () => {
    const schedule = makeSchedule();
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const result = await termination.terminateSchedule(req, 10, { effectiveDate: '2026-06-30' });
    expect(result.settlementMode).toBe('CREDIT');
  });

  test('accepts snake_case effective_date', async () => {
    const schedule = makeSchedule();
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    await termination.terminateSchedule(req, 10, { effective_date: '2026-07-15' });
    expect(schedule.update).toHaveBeenCalledWith(
      expect.objectContaining({ terminatedOn: '2026-07-15' }),
      expect.any(Object)
    );
  });

  test('skips settlement JV when no deferred account', async () => {
    const schedule = makeSchedule({ deferredRevenueAccountId: null });
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindAll.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const result = await termination.terminateSchedule(req, 10, { effectiveDate: '2026-06-30' });
    expect(mockCreatePostedJv).not.toHaveBeenCalled();
    expect(result.settlementJv).toBeNull();
  });
});
