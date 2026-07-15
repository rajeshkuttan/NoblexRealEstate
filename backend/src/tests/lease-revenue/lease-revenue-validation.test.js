'use strict';

jest.mock('../../models', () => ({
  ChartOfAccount: { findOne: jest.fn(), count: jest.fn() },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: jest.fn(() => ({ companyId: 1 })),
  assertAccountInCompany: jest.fn().mockResolvedValue({ id: 99 }),
}));

const { ChartOfAccount } = require('../../models');
const { assertAccountInCompany } = require('../../utils/companyScope');
const validation = require('../../services/leaseRevenue/leaseRevenueValidation.service');

const req = { companyId: 1 };

function expectStatus(err, code) {
  expect(err.statusCode).toBe(code);
}

describe('leaseRevenueValidation.service — validateAmount', () => {
  test('rejects zero amount', () => {
    expect(() => validation.validateAmount(0)).toThrow(/greater than zero/);
    try {
      validation.validateAmount(0);
    } catch (e) {
      expectStatus(e, 400);
    }
  });

  test('rejects negative amount', () => {
    expect(() => validation.validateAmount(-100)).toThrow(/greater than zero/);
  });

  test('rejects null/undefined amount', () => {
    expect(() => validation.validateAmount(null)).toThrow(/greater than zero/);
  });

  test('accepts positive decimal amount', () => {
    expect(() => validation.validateAmount('120000.50')).not.toThrow();
  });
});

describe('leaseRevenueValidation.service — validateDates', () => {
  test('requires start date', () => {
    expect(() => validation.validateDates(null, '2026-12-31')).toThrow(/required/);
  });

  test('requires end date', () => {
    expect(() => validation.validateDates('2026-01-01', null)).toThrow(/required/);
  });

  test('rejects end before start', () => {
    expect(() => validation.validateDates('2026-06-01', '2026-01-01')).toThrow(/on or after/);
  });

  test('accepts same-day period', () => {
    expect(() => validation.validateDates('2026-03-15', '2026-03-15')).not.toThrow();
  });

  test('accepts valid range', () => {
    expect(() => validation.validateDates('2026-01-15', '2027-01-14')).not.toThrow();
  });
});

describe('leaseRevenueValidation.service — validateRevenueAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assertAccountInCompany.mockResolvedValue({ id: 99 });
    ChartOfAccount.count.mockResolvedValue(0);
  });

  test('requires revenue account id', async () => {
    await expect(validation.validateRevenueAccounts(req, {})).rejects.toThrow(/Revenue account is required/);
  });

  test('rejects inactive or missing revenue account', async () => {
    ChartOfAccount.findOne.mockResolvedValue(null);
    await expect(
      validation.validateRevenueAccounts(req, { revenueAccountId: 1 })
    ).rejects.toThrow(/Revenue account not found/);
  });

  test('rejects header revenue account with children', async () => {
    ChartOfAccount.findOne.mockResolvedValue({ id: 1, accountType: 'revenue' });
    ChartOfAccount.count.mockResolvedValue(3);
    await expect(
      validation.validateRevenueAccounts(req, { revenueAccountId: 1 })
    ).rejects.toThrow(/header\/parent account/);
  });

  test('rejects wrong revenue account type', async () => {
    ChartOfAccount.findOne.mockResolvedValue({ id: 1, accountType: 'expense' });
    ChartOfAccount.count.mockResolvedValue(0);
    await expect(
      validation.validateRevenueAccounts(req, { revenueAccountId: 1 })
    ).rejects.toThrow(/must be type revenue/);
  });

  test('DEFERRED model requires deferred revenue account', async () => {
    ChartOfAccount.findOne.mockResolvedValue({ id: 1, accountType: 'revenue' });
    await expect(
      validation.validateRevenueAccounts(req, { revenueAccountId: 1, revenueModel: 'DEFERRED' })
    ).rejects.toThrow(/Deferred revenue account is required/);
  });

  test('DEFERRED model validates liability deferred account', async () => {
    ChartOfAccount.findOne
      .mockResolvedValueOnce({ id: 1, accountType: 'revenue' })
      .mockResolvedValueOnce({ id: 2, accountType: 'liability' });
    await validation.validateRevenueAccounts(req, {
      revenueAccountId: 1,
      deferredRevenueAccountId: 2,
      revenueModel: 'DEFERRED',
    });
    expect(assertAccountInCompany).toHaveBeenCalledTimes(2);
  });

  test('ACCRUED model validates asset accrued account when provided', async () => {
    ChartOfAccount.findOne
      .mockResolvedValueOnce({ id: 1, accountType: 'revenue' })
      .mockResolvedValueOnce({ id: 3, accountType: 'asset' });
    await validation.validateRevenueAccounts(req, {
      revenueAccountId: 1,
      accruedRevenueAccountId: 3,
      revenueModel: 'ACCRUED',
    });
    expect(assertAccountInCompany).toHaveBeenCalledTimes(2);
  });

  test('ACCRUED model skips accrued validation when account omitted', async () => {
    ChartOfAccount.findOne.mockResolvedValue({ id: 1, accountType: 'revenue' });
    await validation.validateRevenueAccounts(req, {
      revenueAccountId: 1,
      revenueModel: 'ACCRUED',
    });
    expect(assertAccountInCompany).toHaveBeenCalledTimes(1);
  });
});

describe('leaseRevenueValidation.service — validateSchedulePayload', () => {
  test('accepts snake_case date fields', () => {
    expect(() =>
      validation.validateSchedulePayload(req, {
        total_contract_amount: '5000',
        service_start_date: '2026-01-01',
        service_end_date: '2026-12-31',
      })
    ).not.toThrow();
  });

  test('rejects invalid amount in payload', () => {
    expect(() =>
      validation.validateSchedulePayload(req, {
        totalContractAmount: 0,
        serviceStartDate: '2026-01-01',
        serviceEndDate: '2026-12-31',
      })
    ).toThrow(/greater than zero/);
  });
});

describe('leaseRevenueValidation.service — hasLockedScheduleLines', () => {
  test('returns false for empty lines', () => {
    expect(validation.hasLockedScheduleLines([])).toBe(false);
  });

  test('detects POSTED postingStatus', () => {
    expect(validation.hasLockedScheduleLines([{ postingStatus: 'POSTED' }])).toBe(true);
  });

  test('detects DRAFT_JV_CREATED posting_status snake_case', () => {
    expect(validation.hasLockedScheduleLines([{ posting_status: 'DRAFT_JV_CREATED' }])).toBe(true);
  });

  test('detects isLocked flag', () => {
    expect(validation.hasLockedScheduleLines([{ isLocked: true, postingStatus: 'SCHEDULED' }])).toBe(true);
  });

  test('LOCKED_LINE_STATUSES includes REVERSED', () => {
    expect(validation.LOCKED_LINE_STATUSES.has('REVERSED')).toBe(true);
  });
});
