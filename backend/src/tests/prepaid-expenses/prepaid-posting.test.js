'use strict';

const mockJvCreate = jest.fn();
const mockJvDetailCreate = jest.fn();
const mockScheduleUpdate = jest.fn();
const mockAllocationFindAll = jest.fn();
const mockValidatePostingDate = jest.fn();
const mockGenerateDocNumber = jest.fn();
const mockCreatePostedJv = jest.fn();
const mockExpenseFindOne = jest.fn();
const mockLineFindOne = jest.fn();
const mockLineFindAll = jest.fn();
const mockLineUpdate = jest.fn();

jest.mock('../../models', () => ({
  PrepaidExpense: { findOne: (...a) => mockExpenseFindOne(...a) },
  PrepaidExpenseScheduleLine: {
    findOne: (...a) => mockLineFindOne(...a),
    findAll: (...a) => mockLineFindAll(...a),
    update: (...a) => mockLineUpdate(...a),
  },
  PrepaidExpenseAllocation: { findAll: (...a) => mockAllocationFindAll(...a) },
  PrepaidExpensePostingBatch: { create: jest.fn() },
  JournalVoucher: {
    create: (...a) => mockJvCreate(...a),
    findByPk: jest.fn(),
  },
  JournalVoucherDetail: { create: (...a) => mockJvDetailCreate(...a) },
  ChartOfAccount: {},
  sequelize: {
    transaction: jest.fn((fn) => fn({})),
  },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  withCompanyId: (_req, data) => ({ companyId: 1, ...data }),
  assertRecordInCompany: jest.fn((_Model, _id, _req, { transaction } = {}) => {
    return mockExpenseFindOne({ transaction });
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

const posting = require('../../services/prepaidExpenses/prepaidPosting.service');

const req = { companyId: 1, user: { id: 5 } };

function makeExpense(overrides = {}) {
  return {
    id: 10,
    prepaidNumber: 'PPD-000001',
    totalAmount: '1000.00',
    recognizedAmount: '0',
    expenseAccountId: 200,
    prepaidAssetAccountId: 100,
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
    update: (...a) => mockScheduleUpdate(...a),
    ...overrides,
  };
}

describe('prepaidPosting.service — postScheduleLine guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
    mockAllocationFindAll.mockResolvedValue([]);
  });

  test('refuses duplicate POSTED line', async () => {
    const expense = makeExpense();
    const line = makeLine({ postingStatus: 'POSTED' });
    mockExpenseFindOne.mockResolvedValue(expense);
    mockLineFindOne.mockResolvedValue(line);
    await expect(posting.postSingleLine(req, 10, 50)).rejects.toThrow(/already posted/);
  });

  test('periodValidation blocks posting date', async () => {
    mockValidatePostingDate.mockRejectedValue(Object.assign(new Error('Period closed'), { statusCode: 400 }));
    const expense = makeExpense();
    const line = makeLine();
    mockExpenseFindOne.mockResolvedValue(expense);
    mockLineFindOne.mockResolvedValue(line);
    await expect(posting.postSingleLine(req, 10, 50)).rejects.toThrow(/Period closed/);
  });
});

describe('prepaidPosting.service — createDraftJv', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
    mockGenerateDocNumber.mockResolvedValue('JV-2026-001');
    mockJvCreate.mockImplementation((data) => Promise.resolve({ id: 900, jvNumber: data.jvNumber, status: 'open' }));
    mockJvDetailCreate.mockResolvedValue({});
    mockScheduleUpdate.mockResolvedValue(undefined);
  });

  test('allocation debit split equals line total', async () => {
    const expense = makeExpense({ expenseAccountId: 200 });
    const line = makeLine({ scheduledAmount: '1000.00' });
    mockAllocationFindAll.mockResolvedValue([
      { expenseAccountId: 201, allocationPercentage: 60 },
      { expenseAccountId: 202, allocationPercentage: 40 },
    ]);

    await posting.createDraftJv(req, expense, line, {});

    const detailCalls = mockJvDetailCreate.mock.calls.map((c) => c[0]);
    const debitSum = detailCalls.reduce((s, d) => s + parseFloat(d.debitAmount || 0), 0);
    const creditSum = detailCalls.reduce((s, d) => s + parseFloat(d.creditAmount || 0), 0);
    expect(debitSum).toBeCloseTo(1000, 2);
    expect(creditSum).toBeCloseTo(1000, 2);
    expect(debitSum).toBe(creditSum);
  });

  test('creates balanced draft JV header totals', async () => {
    const expense = makeExpense();
    const line = makeLine({ scheduledAmount: '500.00' });
    mockAllocationFindAll.mockResolvedValue([]);

    const voucher = await posting.createDraftJv(req, expense, line, {});

    expect(mockJvCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        totalDebit: 500,
        totalCredit: 500,
        status: 'open',
      }),
      expect.any(Object)
    );
    expect(voucher.id).toBe(900);
    expect(mockScheduleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ postingStatus: 'DRAFT_JV_CREATED', isLocked: true }),
      expect.any(Object)
    );
  });

  test('uses fallback JV number when document series empty', async () => {
    mockGenerateDocNumber.mockResolvedValue(null);
    const expense = makeExpense();
    const line = makeLine({ id: 77, scheduledAmount: '100.00' });
    mockAllocationFindAll.mockResolvedValue([]);
    await posting.createDraftJv(req, expense, line, {});
    expect(mockJvCreate).toHaveBeenCalledWith(
      expect.objectContaining({ jvNumber: 'JV-PPD-77' }),
      expect.any(Object)
    );
  });
});

describe('prepaidPosting.service — auto post path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidatePostingDate.mockResolvedValue(undefined);
    mockAllocationFindAll.mockResolvedValue([]);
    mockCreatePostedJv.mockResolvedValue({ voucher: { id: 1, jvNumber: 'JV-AUTO-1' } });
  });

  test('autoPost creates posted system JV and marks line POSTED', async () => {
    const expense = makeExpense({ postingMode: 'AUTO_POST_JV', recognizedAmount: '0' });
    const line = makeLine({ scheduledAmount: '250.00', update: mockScheduleUpdate });
    mockExpenseFindOne.mockResolvedValue(expense);
    mockLineFindOne.mockResolvedValue(line);
    mockScheduleUpdate.mockResolvedValue(undefined);

    const result = await posting.postSingleLine(req, 10, 50, { autoPost: true });
    expect(mockCreatePostedJv).toHaveBeenCalled();
    expect(result.draft).toBe(false);
    expect(expense.update).toHaveBeenCalledWith(
      expect.objectContaining({ recognizedAmount: '250.00', remainingAmount: '750.00' }),
      expect.any(Object)
    );
  });
});

describe('prepaidPosting.service — markDueLines', () => {
  test('updates SCHEDULED lines to DUE', async () => {
    mockLineUpdate.mockResolvedValue([3]);
    const count = await posting.markDueLines(req, '2026-03-31');
    expect(count).toBe(3);
    expect(mockLineUpdate).toHaveBeenCalledWith(
      { postingStatus: 'DUE' },
      expect.objectContaining({ where: expect.objectContaining({ companyId: 1 }) })
    );
  });
});
