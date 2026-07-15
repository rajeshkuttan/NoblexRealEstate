'use strict';

let mockScheduleRecord;
let mockAdjustmentRecord;
const mockScheduleFindAll = jest.fn();
const mockScheduleDestroy = jest.fn();
const mockScheduleCreate = jest.fn();
const mockAdjustmentCount = jest.fn();
const mockAdjustmentCreate = jest.fn();
const mockRegenerateFuture = jest.fn();
const mockSaveVersion = jest.fn();

jest.mock('../../models', () => ({
  LeaseRevenueSchedule: {},
  LeaseRevenueAdjustment: {
    count: (...a) => mockAdjustmentCount(...a),
    create: (...a) => mockAdjustmentCreate(...a),
  },
  LeaseRevenueScheduleLine: {
    findAll: (...a) => mockScheduleFindAll(...a),
    destroy: (...a) => mockScheduleDestroy(...a),
    create: (...a) => mockScheduleCreate(...a),
  },
  sequelize: {
    transaction: jest.fn((fn) => fn({})),
  },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  withCompanyId: (_req, data) => ({ companyId: 1, ...data }),
  assertRecordInCompany: jest.fn((_Model, id) => {
    if (id === 99) return Promise.resolve(mockAdjustmentRecord);
    return Promise.resolve(mockScheduleRecord);
  }),
}));

jest.mock('../../services/leaseRevenue/leaseRevenueSchedule.service', () => ({
  regenerateFutureLinesOnly: (...a) => mockRegenerateFuture(...a),
  saveVersionSnapshot: (...a) => mockSaveVersion(...a),
}));

const amendmentService = require('../../services/leaseRevenue/leaseRevenueAmendment.service');

const req = { companyId: 1, user: { id: 2 } };

function makeSchedule(overrides = {}) {
  return {
    id: 10,
    scheduleNumber: 'LRS-000010',
    status: 'ACTIVE',
    totalContractAmount: '12000',
    serviceStartDate: '2026-01-01',
    serviceEndDate: '2026-12-31',
    revenueAccountId: 4100,
    deferredRevenueAccountId: 2500,
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeAdjustment(overrides = {}) {
  const base = {
    id: 99,
    scheduleId: 10,
    status: 'SUBMITTED',
    adjustmentType: 'EARLY_TERMINATION',
    effectiveDate: '2026-06-30',
    reason: 'Early exit',
    requestedChangesJson: { serviceEndDate: '2026-06-30' },
    update: jest.fn().mockImplementation(function update(data) {
      Object.assign(this, data);
      return Promise.resolve(this);
    }),
    reload: jest.fn().mockImplementation(function reload() {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
  return base;
}

describe('leaseRevenueAmendment.service — createAmendment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdjustmentCount.mockResolvedValue(0);
    mockAdjustmentCreate.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
  });

  test('blocks amendments for DRAFT status', async () => {
    mockScheduleRecord = makeSchedule({ status: 'DRAFT' });
    await expect(amendmentService.createAmendment(req, 10, { reason: 'test' })).rejects.toThrow(
      /not allowed/
    );
  });

  test('blocks amendments for TERMINATED status', async () => {
    mockScheduleRecord = makeSchedule({ status: 'TERMINATED' });
    await expect(amendmentService.createAmendment(req, 10, {})).rejects.toThrow(/not allowed/);
  });

  test('blocks amendments for CANCELLED status', async () => {
    mockScheduleRecord = makeSchedule({ status: 'CANCELLED' });
    await expect(amendmentService.createAmendment(req, 10, {})).rejects.toThrow(/not allowed/);
  });

  test('creates SUBMITTED amendment for ACTIVE schedule', async () => {
    mockScheduleRecord = makeSchedule({ status: 'ACTIVE' });
    const adj = await amendmentService.createAmendment(req, 10, {
      adjustmentType: 'AMOUNT_CHANGE',
      reason: 'Increase rent',
    });
    expect(mockAdjustmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        adjustmentNumber: 'ADJ-LRS-000010-1',
        status: 'SUBMITTED',
      }),
      expect.any(Object)
    );
    expect(adj.status).toBe('SUBMITTED');
  });

  test('accepts snake_case amendment fields', async () => {
    mockScheduleRecord = makeSchedule({ status: 'ACTIVE' });
    await amendmentService.createAmendment(req, 10, {
      adjustment_type: 'END_DATE_CHANGE',
      effective_date: '2026-08-01',
    });
    expect(mockAdjustmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({ adjustmentType: 'END_DATE_CHANGE', effectiveDate: '2026-08-01' }),
      expect.any(Object)
    );
  });
});

describe('leaseRevenueAmendment.service — approveAmendment early termination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduleRecord = makeSchedule();
    mockAdjustmentRecord = makeAdjustment();
    mockScheduleFindAll.mockResolvedValue([{ scheduledAmount: '6000', postingStatus: 'POSTED' }]);
    mockScheduleDestroy.mockResolvedValue(undefined);
    mockScheduleCreate.mockResolvedValue({});
    mockSaveVersion.mockResolvedValue(2);
  });

  test('approves and terminates schedule, only touches unposted future lines', async () => {
    await amendmentService.approveAmendment(req, 99);
    expect(mockScheduleDestroy).toHaveBeenCalled();
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'TERMINATED', serviceEndDate: '2026-06-30' }),
      expect.any(Object)
    );
    expect(mockAdjustmentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED' }),
      expect.any(Object)
    );
    expect(mockSaveVersion).toHaveBeenCalled();
  });

  test('rejects approve when adjustment not SUBMITTED', async () => {
    mockAdjustmentRecord = makeAdjustment({ status: 'APPROVED' });
    await expect(amendmentService.approveAmendment(req, 99)).rejects.toThrow(/not pending/);
  });
});

describe('leaseRevenueAmendment.service — amount change uses regenerateFutureLinesOnly', () => {
  test('delegates tail regeneration on AMOUNT_CHANGE', async () => {
    mockScheduleRecord = makeSchedule();
    mockAdjustmentRecord = makeAdjustment({
      adjustmentType: 'AMOUNT_CHANGE',
      requestedChangesJson: { totalContractAmount: '15000' },
      effectiveDate: '2026-04-01',
    });
    mockSaveVersion.mockResolvedValue(2);
    mockRegenerateFuture.mockResolvedValue([]);
    await amendmentService.approveAmendment(req, 99);
    expect(mockRegenerateFuture).toHaveBeenCalledWith(
      req,
      mockScheduleRecord,
      '2026-04-01',
      mockScheduleRecord.serviceEndDate,
      '15000',
      expect.any(Object)
    );
  });
});

describe('leaseRevenueAmendment.service — END_DATE_CHANGE', () => {
  test('updates end date and regenerates future lines', async () => {
    mockScheduleRecord = makeSchedule();
    mockAdjustmentRecord = makeAdjustment({
      adjustmentType: 'END_DATE_CHANGE',
      requestedChangesJson: { serviceEndDate: '2026-09-30' },
      effectiveDate: '2026-07-01',
    });
    mockSaveVersion.mockResolvedValue(2);
    mockRegenerateFuture.mockResolvedValue([]);
    await amendmentService.approveAmendment(req, 99);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ serviceEndDate: '2026-09-30' }),
      expect.any(Object)
    );
    expect(mockRegenerateFuture).toHaveBeenCalled();
  });
});

describe('leaseRevenueAmendment.service — ACCOUNT_CHANGE', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveVersion.mockResolvedValue(2);
  });

  test('updates revenue accounts without regeneration', async () => {
    mockScheduleRecord = makeSchedule();
    mockAdjustmentRecord = makeAdjustment({
      adjustmentType: 'ACCOUNT_CHANGE',
      requestedChangesJson: { revenueAccountId: 4200, deferredRevenueAccountId: 2510 },
    });
    mockSaveVersion.mockResolvedValue(2);
    await amendmentService.approveAmendment(req, 99);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ revenueAccountId: 4200, deferredRevenueAccountId: 2510 }),
      expect.any(Object)
    );
    expect(mockRegenerateFuture).not.toHaveBeenCalled();
  });
});

describe('leaseRevenueAmendment.service — rejectAmendment', () => {
  test('rejects pending adjustment', async () => {
    mockAdjustmentRecord = makeAdjustment();
    const result = await amendmentService.rejectAmendment(req, 99, { reason: 'Not justified' });
    expect(mockAdjustmentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REJECTED' })
    );
    expect(result.status).toBe('REJECTED');
  });

  test('blocks reject when not SUBMITTED', async () => {
    mockAdjustmentRecord = makeAdjustment({ status: 'REJECTED' });
    await expect(amendmentService.rejectAmendment(req, 99)).rejects.toThrow(/not pending/);
  });
});
