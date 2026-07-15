'use strict';

let mockExpenseRecord;
let mockAmendmentRecord;
const mockScheduleFindAll = jest.fn();
const mockScheduleDestroy = jest.fn();
const mockScheduleCreate = jest.fn();
const mockAmendmentCount = jest.fn();
const mockAmendmentCreate = jest.fn();
const mockRegenerateFuture = jest.fn();

jest.mock('../../models', () => ({
  PrepaidExpense: {
    findOne: jest.fn(() => Promise.resolve(mockExpenseRecord)),
  },
  PrepaidExpenseAmendment: {
    findOne: jest.fn(() => Promise.resolve(mockAmendmentRecord)),
    count: (...a) => mockAmendmentCount(...a),
    create: (...a) => mockAmendmentCreate(...a),
  },
  PrepaidExpenseScheduleLine: {
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
    if (id === 99) return Promise.resolve(mockAmendmentRecord);
    return Promise.resolve(mockExpenseRecord);
  }),
}));

jest.mock('../../services/prepaidExpenses/prepaidSchedule.service', () => ({
  regenerateFutureLinesOnly: (...a) => mockRegenerateFuture(...a),
}));

const amendmentService = require('../../services/prepaidExpenses/prepaidAmendment.service');

const req = { companyId: 1, user: { id: 2 } };

function makeExpense(overrides = {}) {
  return {
    id: 10,
    prepaidNumber: 'PPD-000010',
    status: 'ACTIVE',
    totalAmount: '12000',
    serviceStartDate: '2026-01-01',
    serviceEndDate: '2026-12-31',
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeAmendment(overrides = {}) {
  const base = {
    id: 99,
    prepaidExpenseId: 10,
    status: 'SUBMITTED',
    amendmentType: 'EARLY_TERMINATION',
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

describe('prepaidAmendment.service — createAmendment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAmendmentCount.mockResolvedValue(0);
    mockAmendmentCreate.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
  });

  test('blocks amendments for DRAFT status', async () => {
    mockExpenseRecord = makeExpense({ status: 'DRAFT' });
    await expect(amendmentService.createAmendment(req, 10, { reason: 'test' })).rejects.toThrow(
      /not allowed/
    );
  });

  test('blocks amendments for TERMINATED status', async () => {
    mockExpenseRecord = makeExpense({ status: 'TERMINATED' });
    await expect(amendmentService.createAmendment(req, 10, {})).rejects.toThrow(/not allowed/);
  });

  test('creates SUBMITTED amendment for ACTIVE expense', async () => {
    mockExpenseRecord = makeExpense({ status: 'ACTIVE' });
    const amd = await amendmentService.createAmendment(req, 10, {
      amendmentType: 'AMOUNT_CHANGE',
      reason: 'Increase coverage',
    });
    expect(mockAmendmentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amendmentNumber: 'AMD-PPD-000010-1',
        status: 'SUBMITTED',
      }),
      expect.any(Object)
    );
    expect(amd.status).toBe('SUBMITTED');
  });
});

describe('prepaidAmendment.service — approveAmendment early termination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExpenseRecord = makeExpense();
    mockAmendmentRecord = makeAmendment();
    mockScheduleFindAll.mockResolvedValue([
      { scheduledAmount: '6000', postingStatus: 'POSTED' },
    ]);
    mockScheduleDestroy.mockResolvedValue(undefined);
    mockScheduleCreate.mockResolvedValue({});
  });

  test('approves and terminates expense, only touches unposted future lines', async () => {
    await amendmentService.approveAmendment(req, 99);
    expect(mockScheduleDestroy).toHaveBeenCalled();
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'TERMINATED', serviceEndDate: '2026-06-30' }),
      expect.any(Object)
    );
    expect(mockAmendmentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED' }),
      expect.any(Object)
    );
  });

  test('rejects approve when amendment not SUBMITTED', async () => {
    mockAmendmentRecord = makeAmendment({ status: 'APPROVED' });
    await expect(amendmentService.approveAmendment(req, 99)).rejects.toThrow(/not pending/);
  });
});

describe('prepaidAmendment.service — amount change uses regenerateFutureLinesOnly', () => {
  test('delegates tail regeneration on AMOUNT_CHANGE', async () => {
    mockExpenseRecord = makeExpense();
    mockAmendmentRecord = makeAmendment({
      amendmentType: 'AMOUNT_CHANGE',
      requestedChangesJson: { totalAmount: '15000' },
      effectiveDate: '2026-04-01',
    });
    mockRegenerateFuture.mockResolvedValue([]);
    await amendmentService.approveAmendment(req, 99);
    expect(mockRegenerateFuture).toHaveBeenCalledWith(
      req,
      mockExpenseRecord,
      '2026-04-01',
      mockExpenseRecord.serviceEndDate,
      '15000',
      expect.any(Object)
    );
  });
});

describe('prepaidAmendment.service — rejectAmendment', () => {
  test('rejects pending amendment', async () => {
    mockAmendmentRecord = makeAmendment();
    const result = await amendmentService.rejectAmendment(req, 99, { reason: 'Not justified' });
    expect(mockAmendmentRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'REJECTED' })
    );
    expect(result.status).toBe('REJECTED');
  });

  test('blocks reject when not SUBMITTED', async () => {
    mockAmendmentRecord = makeAmendment({ status: 'REJECTED' });
    await expect(amendmentService.rejectAmendment(req, 99)).rejects.toThrow(/not pending/);
  });
});
