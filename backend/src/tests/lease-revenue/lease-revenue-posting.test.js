'use strict';

const mockJvCreate = jest.fn();
const mockJvDetailCreate = jest.fn();
const mockJvFindByPk = jest.fn();
const mockScheduleUpdate = jest.fn();
const mockLineUpdate = jest.fn();
const mockValidatePostingDate = jest.fn();
const mockGenerateDocNumber = jest.fn();
const mockCreatePostedJv = jest.fn();
const mockScheduleFindOne = jest.fn();
const mockLineFindOne = jest.fn();
const mockLineFindAll = jest.fn();
const mockLineUpdateBulk = jest.fn();
const mockJvDetailFindAll = jest.fn();
const mockCoaFindOne = jest.fn();
const mockAccountsTransFindOne = jest.fn();
const mockCreateAccountingEntry = jest.fn();
const mockBatchCreate = jest.fn();
const mockBatchFindOne = jest.fn();

jest.mock('../../models', () => ({
  LeaseRevenueSchedule: { findOne: (...a) => mockScheduleFindOne(...a) },
  LeaseRevenueScheduleLine: {
    findOne: (...a) => mockLineFindOne(...a),
    findAll: (...a) => mockLineFindAll(...a),
    update: (...a) => mockLineUpdateBulk(...a),
  },
  LeaseRevenuePostingBatch: { create: (...a) => mockBatchCreate(...a) },
  JournalVoucher: {
    create: (...a) => mockJvCreate(...a),
    findByPk: (...a) => mockJvFindByPk(...a),
  },
  JournalVoucherDetail: {
    create: (...a) => mockJvDetailCreate(...a),
    findAll: (...a) => mockJvDetailFindAll(...a),
  },
  ChartOfAccount: { findOne: (...a) => mockCoaFindOne(...a) },
  AccountsTrans: { findOne: (...a) => mockAccountsTransFindOne(...a) },
  sequelize: {
    transaction: jest.fn((fn) => fn({})),
  },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  withCompanyId: (_req, data) => ({ companyId: 1, ...data }),
  assertRecordInCompany: jest.fn((_Model, _id, _req, { transaction } = {}) => {
    if (_Model.name === 'LeaseRevenuePostingBatch') {
      return mockBatchFindOne({ transaction });
    }
    return mockScheduleFindOne({ transaction });
  }),
}));

jest.mock('../../services/periodValidationService', () => ({
  validatePostingDate: (...a) => mockValidatePostingDate(...a),
}));

jest.mock('../../services/companyDocumentNumber.service', () => ({
  generateDocumentNumber: (...a) => mockGenerateDocNumber(...a),
}));

jest.mock('../../services/systemJournalVoucher.service', () => ({
  createPostedSystemJournalVoucher: (...a) => mockCreatePostedJv(...a),
}));

jest.mock('../../services/companyAccountingEntry.service', () => ({
  createCompanyAccountingEntry: (...a) => mockCreateAccountingEntry(...a),
  COMPANY_AUDIT_ACTIONS: { JV_POSTED: 'JV_POSTED' },
}));

jest.mock('../../services/leaseRevenue/leaseRevenueDocumentNumber.service', () => ({
  generatePostingBatchNumber: jest.fn().mockResolvedValue('LRB-000001'),
}));

const posting = require('../../services/leaseRevenue/leaseRevenuePosting.service');

const req = { companyId: 1, user: { id: 5 } };

function makeSchedule(overrides = {}) {
  return {
    id: 10,
    scheduleNumber: 'LRS-000001',
    totalContractAmount: '1000.00',
    recognizedAmount: '0',
    deferredBalance: '1000.00',
    revenueAccountId: 4100,
    deferredRevenueAccountId: 2500,
    accruedRevenueAccountId: 1200,
    revenueModel: 'DEFERRED',
    postingMode: 'AUTO_CREATE_DRAFT_JV',
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeLine(overrides = {}) {
  return {
    id: 50,
    lineNumber: 1,
    scheduledAmount: '1000.00',
    recognitionDate: '2026-01-31',
    periodEndDate: '2026-01-31',
    postingStatus: 'DUE',
    update: (...a) => mockLineUpdate(...a),
    ...overrides,
  };
}

describe('leaseRevenuePosting.service — buildRecognitionJvLines', () => {
  test('DEFERRED model debits deferred and credits revenue', () => {
    const schedule = makeSchedule({ revenueModel: 'DEFERRED' });
    const lines = posting.buildRecognitionJvLines(schedule, 500);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual(expect.objectContaining({ ledgerId: 2500, debit: 500, credit: 0 }));
    expect(lines[1]).toEqual(expect.objectContaining({ ledgerId: 4100, debit: 0, credit: 500 }));
  });

  test('DEFERRED falls back to revenue account when deferred missing', () => {
    const schedule = makeSchedule({ deferredRevenueAccountId: null });
    const lines = posting.buildRecognitionJvLines(schedule, 100);
    expect(lines[0].ledgerId).toBe(4100);
  });

  test('ACCRUED model debits accrued asset and credits revenue', () => {
    const schedule = makeSchedule({ revenueModel: 'ACCRUED', accruedRevenueAccountId: 1200 });
    const lines = posting.buildRecognitionJvLines(schedule, 250);
    expect(lines[0]).toEqual(expect.objectContaining({ ledgerId: 1200, debit: 250, credit: 0 }));
    expect(lines[1]).toEqual(expect.objectContaining({ ledgerId: 4100, debit: 0, credit: 250 }));
  });

  test('ACCRUED without accrued account uses deferred path', () => {
    const schedule = makeSchedule({ revenueModel: 'ACCRUED', accruedRevenueAccountId: null });
    const lines = posting.buildRecognitionJvLines(schedule, 100);
    expect(lines[0].ledgerId).toBe(2500);
  });
});

describe('leaseRevenuePosting.service — postScheduleLine guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
  });

  test('refuses duplicate POSTED line', async () => {
    const schedule = makeSchedule();
    const line = makeLine({ postingStatus: 'POSTED' });
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindOne.mockResolvedValue(line);
    await expect(posting.postSingleLine(req, 10, 50)).rejects.toThrow(/already posted/);
  });

  test('periodValidation blocks posting date', async () => {
    mockValidatePostingDate.mockRejectedValue(Object.assign(new Error('Period closed'), { statusCode: 400 }));
    const schedule = makeSchedule();
    const line = makeLine();
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindOne.mockResolvedValue(line);
    await expect(posting.postSingleLine(req, 10, 50)).rejects.toThrow(/Period closed/);
  });
});

describe('leaseRevenuePosting.service — createDraftJv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
    mockGenerateDocNumber.mockResolvedValue('JV-2026-001');
    mockJvCreate.mockImplementation((data) => Promise.resolve({ id: 900, jvNumber: data.jvNumber, status: 'open' }));
    mockJvDetailCreate.mockResolvedValue({});
    mockLineUpdate.mockResolvedValue(undefined);
  });

  test('creates balanced draft JV header totals', async () => {
    const schedule = makeSchedule();
    const line = makeLine({ scheduledAmount: '500.00' });
    const voucher = await posting.createDraftJv(req, schedule, line, {});
    expect(mockJvCreate).toHaveBeenCalledWith(
      expect.objectContaining({ totalDebit: 500, totalCredit: 500, status: 'open' }),
      expect.any(Object)
    );
    expect(voucher.id).toBe(900);
    expect(mockLineUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ postingStatus: 'DRAFT_JV_CREATED', isLocked: true }),
      expect.any(Object)
    );
  });

  test('uses fallback JV number when document series empty', async () => {
    mockGenerateDocNumber.mockResolvedValue(null);
    const schedule = makeSchedule();
    const line = makeLine({ id: 77, scheduledAmount: '100.00' });
    await posting.createDraftJv(req, schedule, line, {});
    expect(mockJvCreate).toHaveBeenCalledWith(
      expect.objectContaining({ jvNumber: 'JV-LRS-77' }),
      expect.any(Object)
    );
  });

  test('creates two JV detail lines for deferred recognition', async () => {
    const schedule = makeSchedule();
    const line = makeLine({ scheduledAmount: '300.00' });
    await posting.createDraftJv(req, schedule, line, {});
    expect(mockJvDetailCreate).toHaveBeenCalledTimes(2);
  });
});

describe('leaseRevenuePosting.service — auto post path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
    mockCreatePostedJv.mockResolvedValue({ voucher: { id: 1, jvNumber: 'JV-AUTO-1' } });
  });

  test('autoPost creates posted system JV and marks line POSTED', async () => {
    const schedule = makeSchedule({ postingMode: 'AUTO_POST_JV', recognizedAmount: '0' });
    const line = makeLine({ scheduledAmount: '250.00', update: mockLineUpdate });
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindOne.mockResolvedValue(line);
    mockLineUpdate.mockResolvedValue(undefined);
    const result = await posting.postSingleLine(req, 10, 50, { autoPost: true });
    expect(mockCreatePostedJv).toHaveBeenCalled();
    expect(result.draft).toBe(false);
    expect(schedule.update).toHaveBeenCalledWith(
      expect.objectContaining({ recognizedAmount: '250.00', remainingAmount: '750.00' }),
      expect.any(Object)
    );
  });

  test('fully recognized schedule sets FULLY_RECOGNIZED status', async () => {
    const schedule = makeSchedule({ totalContractAmount: '250.00', recognizedAmount: '0' });
    const line = makeLine({ scheduledAmount: '250.00' });
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindOne.mockResolvedValue(line);
    mockLineUpdate.mockResolvedValue(undefined);
    await posting.postSingleLine(req, 10, 50, { autoPost: true });
    expect(schedule.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FULLY_RECOGNIZED', remainingAmount: '0.00' }),
      expect.any(Object)
    );
  });
});

describe('leaseRevenuePosting.service — finalizeOpenDraftJv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
    mockAccountsTransFindOne.mockResolvedValue({ transactionNo: 100000 });
    mockJvDetailFindAll.mockResolvedValue([
      { ledgerId: 2500, debitAmount: 100, creditAmount: 0, narration: 'Dr' },
      { ledgerId: 4100, debitAmount: 0, creditAmount: 100, narration: 'Cr' },
    ]);
    mockCoaFindOne.mockResolvedValue({ id: 2500, accountType: 'liability', balance: 1000, update: jest.fn() });
    mockCreateAccountingEntry.mockResolvedValue(undefined);
  });

  test('returns voucher unchanged when already posted', async () => {
    const voucher = { id: 1, status: 'posted', reload: jest.fn() };
    const result = await posting.finalizeOpenDraftJv(req, voucher, {});
    expect(result).toBe(voucher);
    expect(mockJvDetailFindAll).not.toHaveBeenCalled();
  });

  test('rejects cancelled voucher', async () => {
    const voucher = { id: 1, status: 'cancelled' };
    await expect(posting.finalizeOpenDraftJv(req, voucher, {})).rejects.toThrow(/cancelled/);
  });

  test('rejects unbalanced JV details', async () => {
    mockJvDetailFindAll.mockResolvedValue([
      { ledgerId: 2500, debitAmount: 100, creditAmount: 0 },
      { ledgerId: 4100, debitAmount: 0, creditAmount: 90 },
    ]);
    const voucher = {
      id: 1,
      status: 'open',
      date: '2026-01-31',
      jvNumber: 'JV-1',
      update: jest.fn(),
      reload: jest.fn(),
    };
    await expect(posting.finalizeOpenDraftJv(req, voucher, {})).rejects.toThrow(/Unbalanced JV/);
  });

  test('finalizes open draft and sets posted status', async () => {
    const voucher = {
      id: 1,
      status: 'open',
      date: '2026-01-31',
      jvNumber: 'JV-1',
      narration: 'Test',
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue({ id: 1, status: 'posted' }),
    };
    const result = await posting.finalizeOpenDraftJv(req, voucher, {});
    expect(mockCreateAccountingEntry).toHaveBeenCalled();
    expect(voucher.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'posted', postedBy: 5 }),
      expect.any(Object)
    );
    expect(result.status).toBe('posted');
  });
});

describe('leaseRevenuePosting.service — draft JV exists path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
  });

  test('blocks posting when draft exists without autoPost', async () => {
    const schedule = makeSchedule({ postingMode: 'AUTO_CREATE_DRAFT_JV' });
    const line = makeLine({ journalVoucherId: 99 });
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindOne.mockResolvedValue(line);
    mockJvFindByPk.mockResolvedValue({ id: 99, status: 'open' });
    await expect(posting.postSingleLine(req, 10, 50)).rejects.toThrow(/Draft JV already exists/);
  });

  test('finalizes existing draft when autoPost requested', async () => {
    const schedule = makeSchedule({ postingMode: 'AUTO_CREATE_DRAFT_JV', recognizedAmount: '0' });
    const line = makeLine({ journalVoucherId: 99, scheduledAmount: '100.00' });
    mockScheduleFindOne.mockResolvedValue(schedule);
    mockLineFindOne.mockResolvedValue(line);
    const openVoucher = {
      id: 99,
      status: 'open',
      date: '2026-01-31',
      jvNumber: 'JV-DRAFT',
      update: jest.fn().mockResolvedValue(undefined),
      reload: jest.fn().mockResolvedValue({ id: 99, status: 'posted', jvNumber: 'JV-DRAFT' }),
    };
    mockJvFindByPk.mockResolvedValue(openVoucher);
    mockJvDetailFindAll.mockResolvedValue([
      { ledgerId: 2500, debitAmount: 100, creditAmount: 0 },
      { ledgerId: 4100, debitAmount: 0, creditAmount: 100 },
    ]);
    mockAccountsTransFindOne.mockResolvedValue(null);
    mockCoaFindOne.mockResolvedValue({ accountType: 'liability', balance: 0, update: jest.fn() });
    mockCreateAccountingEntry.mockResolvedValue(undefined);
    mockLineUpdate.mockResolvedValue(undefined);
    const result = await posting.postSingleLine(req, 10, 50, { autoPost: true });
    expect(result.draft).toBe(false);
    expect(openVoucher.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'posted' }), expect.any(Object));
  });
});

describe('leaseRevenuePosting.service — markDueLines and queue', () => {
  test('updates SCHEDULED lines to DUE', async () => {
    mockLineUpdateBulk.mockResolvedValue([3]);
    const count = await posting.markDueLines(req, '2026-03-31');
    expect(count).toBe(3);
    expect(mockLineUpdateBulk).toHaveBeenCalledWith(
      { postingStatus: 'DUE' },
      expect.objectContaining({ where: expect.objectContaining({ companyId: 1 }) })
    );
  });

  test('getPostingQueue queries DUE and draft lines', async () => {
    mockLineFindAll.mockResolvedValue([{ id: 1 }]);
    const queue = await posting.getPostingQueue(req, { recognitionMonth: '2026-01' });
    expect(queue).toHaveLength(1);
    expect(mockLineFindAll).toHaveBeenCalled();
  });
});

describe('leaseRevenuePosting.service — batches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
    mockBatchCreate.mockImplementation((data) => Promise.resolve({ id: 1, ...data, reload: jest.fn() }));
  });

  test('createPostingBatch assigns line ids', async () => {
    mockLineUpdateBulk.mockResolvedValue([2]);
    const batch = await posting.createPostingBatch(req, { lineIds: [10, 11] });
    expect(batch.batchNumber).toBe('LRB-000001');
    expect(mockLineUpdateBulk).toHaveBeenCalled();
  });
});
