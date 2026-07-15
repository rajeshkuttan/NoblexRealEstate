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
const validation = require('../../services/prepaidExpenses/prepaidValidation.service');

const req = { companyId: 1 };

function expectStatus(err, code) {
  expect(err.statusCode).toBe(code);
}

describe('prepaidValidation.service — validateAmount', () => {
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

describe('prepaidValidation.service — validateDates', () => {
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

describe('prepaidValidation.service — validateAllocations', () => {
  test('allows empty allocations', () => {
    expect(() => validation.validateAllocations([])).not.toThrow();
  });

  test('passes when percentages sum to 100', () => {
    expect(() =>
      validation.validateAllocations([
        { allocationPercentage: 60 },
        { allocationPercentage: 40 },
      ])
    ).not.toThrow();
  });

  test('accepts snake_case allocation_percentage', () => {
    expect(() =>
      validation.validateAllocations([
        { allocation_percentage: 70 },
        { allocation_percentage: 30 },
      ])
    ).not.toThrow();
  });

  test('rejects when sum is not 100', () => {
    expect(() =>
      validation.validateAllocations([
        { allocationPercentage: 50 },
        { allocationPercentage: 40 },
      ])
    ).toThrow(/must sum to 100/);
  });
});

describe('prepaidValidation.service — validatePrepaidAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    assertAccountInCompany.mockResolvedValue({ id: 99 });
    ChartOfAccount.count.mockResolvedValue(0);
  });

  test('requires prepaid asset and expense account ids', async () => {
    await expect(
      validation.validatePrepaidAccounts(req, { prepaidAssetAccountId: null, expenseAccountId: 2 })
    ).rejects.toThrow(/required/);
  });

  test('rejects inactive or missing asset account', async () => {
    ChartOfAccount.findOne.mockResolvedValue(null);
    await expect(
      validation.validatePrepaidAccounts(req, { prepaidAssetAccountId: 1, expenseAccountId: 2 })
    ).rejects.toThrow(/Prepaid asset account not found/);
  });

  test('rejects header account that has child accounts', async () => {
    ChartOfAccount.findOne.mockResolvedValue({
      id: 1,
      accountType: 'asset',
      parentAccountId: null,
      isActive: true,
    });
    ChartOfAccount.count.mockResolvedValue(2);
    await expect(
      validation.validatePrepaidAccounts(req, { prepaidAssetAccountId: 1, expenseAccountId: 2 })
    ).rejects.toThrow(/header\/parent/);
  });

  test('accepts leaf asset account that has a parent', async () => {
    ChartOfAccount.findOne
      .mockResolvedValueOnce({
        id: 10,
        accountType: 'asset',
        parentAccountId: 1,
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 20,
        accountType: 'expense',
        parentAccountId: 2,
        isActive: true,
      });
    ChartOfAccount.count.mockResolvedValue(0);
    await expect(
      validation.validatePrepaidAccounts(req, { prepaidAssetAccountId: 10, expenseAccountId: 20 })
    ).resolves.toBeUndefined();
  });

  test('rejects wrong account type for asset', async () => {
    ChartOfAccount.findOne.mockResolvedValue({
      id: 1,
      accountType: 'expense',
      parentAccountId: null,
      isActive: true,
    });
    await expect(
      validation.validatePrepaidAccounts(req, { prepaidAssetAccountId: 1, expenseAccountId: 2 })
    ).rejects.toThrow(/must be type asset/);
  });

  test('rejects wrong account type for expense', async () => {
    ChartOfAccount.findOne
      .mockResolvedValueOnce({ id: 1, accountType: 'asset', parentAccountId: null, isActive: true })
      .mockResolvedValueOnce({ id: 2, accountType: 'asset', parentAccountId: null, isActive: true });
    await expect(
      validation.validatePrepaidAccounts(req, { prepaidAssetAccountId: 1, expenseAccountId: 2 })
    ).rejects.toThrow(/must be type expense/);
  });

  test('validates credit account when provided', async () => {
    ChartOfAccount.findOne
      .mockResolvedValueOnce({ id: 1, accountType: 'asset', parentAccountId: null, isActive: true })
      .mockResolvedValueOnce({ id: 2, accountType: 'expense', parentAccountId: null, isActive: true });
    await validation.validatePrepaidAccounts(req, {
      prepaidAssetAccountId: 1,
      expenseAccountId: 2,
      creditAccountId: 3,
    });
    expect(assertAccountInCompany).toHaveBeenCalledWith(3, req);
  });
});

describe('prepaidValidation.service — hasLockedScheduleLines', () => {
  test('returns false for empty lines', () => {
    expect(validation.hasLockedScheduleLines([])).toBe(false);
  });

  test('detects isLocked flag', () => {
    expect(validation.hasLockedScheduleLines([{ isLocked: true, postingStatus: 'SCHEDULED' }])).toBe(true);
  });

  test('detects POSTED postingStatus', () => {
    expect(validation.hasLockedScheduleLines([{ postingStatus: 'POSTED' }])).toBe(true);
  });

  test('detects DRAFT_JV_CREATED posting_status snake_case', () => {
    expect(validation.hasLockedScheduleLines([{ posting_status: 'DRAFT_JV_CREATED' }])).toBe(true);
  });

  test('returns false for SCHEDULED unposted lines', () => {
    expect(validation.hasLockedScheduleLines([{ postingStatus: 'SCHEDULED', isLocked: false }])).toBe(false);
  });
});
