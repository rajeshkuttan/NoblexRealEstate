'use strict';

const mockGetPrepaidExpense = jest.fn();
const mockGetSettings = jest.fn();
const mockCoaFindOne = jest.fn();
const mockReconCreate = jest.fn();
let mockReconRecord;

jest.mock('../../models', () => ({
  ChartOfAccount: { findOne: (...a) => mockCoaFindOne(...a) },
  PrepaidExpenseReconciliation: {
    create: (...a) => mockReconCreate(...a),
  },
  sequelize: {},
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  withCompanyId: (_req, data) => ({ companyId: 1, ...data }),
  assertRecordInCompany: jest.fn(() => Promise.resolve(mockReconRecord)),
}));

jest.mock('../../services/prepaidExpenses/prepaidExpense.service', () => ({
  getPrepaidExpense: (...a) => mockGetPrepaidExpense(...a),
  getSettings: (...a) => mockGetSettings(...a),
}));

const reconciliation = require('../../services/prepaidExpenses/prepaidReconciliation.service');

const req = { companyId: 1, user: { id: 1 } };

function setupExpense(remaining = '5000', glBalance = '5000') {
  mockGetPrepaidExpense.mockResolvedValue({
    id: 10,
    totalAmount: '12000',
    recognizedAmount: '7000',
    remainingAmount: remaining,
    prepaidAssetAccountId: 100,
  });
  mockCoaFindOne.mockResolvedValue({ id: 100, balance: glBalance });
  mockGetSettings.mockResolvedValue({
    settingsJson: { tolerance: { reconciliation: 1.0 } },
  });
}

describe('prepaidReconciliation.service — computeReconciliation status', () => {
  test('MATCHED when difference is zero', async () => {
    setupExpense('5000.00', '5000.00');
    const result = await reconciliation.computeReconciliation(req, 10, '2026-06-30');
    expect(result.status).toBe('MATCHED');
    expect(result.differenceAmount).toBe('0.00');
    expect(result.exceptionReason).toBeNull();
  });

  test('MATCHED when difference within 0.01', async () => {
    setupExpense('5000.00', '5000.005');
    const result = await reconciliation.computeReconciliation(req, 10);
    expect(result.status).toBe('MATCHED');
  });

  test('MATCHED_WITHIN_TOLERANCE when difference within tolerance but above 0.01', async () => {
    setupExpense('5000.00', '5000.50');
    const result = await reconciliation.computeReconciliation(req, 10);
    expect(result.status).toBe('MATCHED_WITHIN_TOLERANCE');
    expect(result.exceptionReason).toBeNull();
  });

  test('EXCEPTION when difference exceeds tolerance', async () => {
    setupExpense('5000.00', '4998.00');
    const result = await reconciliation.computeReconciliation(req, 10);
    expect(result.status).toBe('EXCEPTION');
    expect(result.exceptionReason).toMatch(/Subledger balance differs/);
    expect(parseFloat(result.differenceAmount)).toBe(2);
  });

  test('handles missing GL account as zero balance', async () => {
    mockGetPrepaidExpense.mockResolvedValue({
      id: 10,
      totalAmount: '1000',
      recognizedAmount: '0',
      remainingAmount: '1000',
      prepaidAssetAccountId: 100,
    });
    mockCoaFindOne.mockResolvedValue(null);
    mockGetSettings.mockResolvedValue({ settingsJson: { tolerance: { reconciliation: 1.0 } } });
    const result = await reconciliation.computeReconciliation(req, 10);
    expect(result.prepaidGlBalance).toBe(0);
    expect(result.status).toBe('EXCEPTION');
  });
});

describe('prepaidReconciliation.service — create and resolve', () => {
  test('createReconciliation persists computed payload', async () => {
    setupExpense('3000', '3000');
    mockReconCreate.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));
    const row = await reconciliation.createReconciliation(req, 10);
    expect(mockReconCreate).toHaveBeenCalledWith(
      expect.objectContaining({ prepaidExpenseId: 10, status: 'MATCHED' })
    );
    expect(row.prepaidExpenseId).toBe(10);
  });

  test('resolveReconciliation marks RESOLVED', async () => {
    mockReconRecord = {
      id: 5,
      status: 'EXCEPTION',
      exceptionReason: 'Mismatch',
      update: jest.fn().mockResolvedValue(undefined),
    };
    const resolved = await reconciliation.resolveReconciliation(req, 5, { notes: 'Adjusted GL' });
    expect(mockReconRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'RESOLVED', resolvedBy: 1 })
    );
    expect(resolved).toBe(mockReconRecord);
  });
});
