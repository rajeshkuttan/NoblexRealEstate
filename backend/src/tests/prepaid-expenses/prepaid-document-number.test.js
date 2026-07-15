'use strict';

const mockGenerateDocumentNumber = jest.fn();
const mockPrepaidCount = jest.fn();
const mockBatchCount = jest.fn();

jest.mock('../../services/companyDocumentNumber.service', () => ({
  generateDocumentNumber: (...a) => mockGenerateDocumentNumber(...a),
}));

jest.mock('../../models', () => ({
  PrepaidExpense: { count: (...a) => mockPrepaidCount(...a) },
  PrepaidExpensePostingBatch: { count: (...a) => mockBatchCount(...a) },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
}));

const docNumbers = require('../../services/prepaidExpenses/prepaidDocumentNumber.service');

const req = { companyId: 1 };
const tx = {};

describe('prepaidDocumentNumber.service — generatePrepaidNumber', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns company document number when series available', async () => {
    mockGenerateDocumentNumber.mockResolvedValue('PPD-2026-00042');
    const num = await docNumbers.generatePrepaidNumber(req, tx);
    expect(num).toBe('PPD-2026-00042');
    expect(mockGenerateDocumentNumber).toHaveBeenCalledWith({
      companyId: 1,
      documentType: 'prepaid_expense',
      transaction: tx,
    });
  });

  test('falls back to PPD- padded count when series empty', async () => {
    mockGenerateDocumentNumber.mockResolvedValue(null);
    mockPrepaidCount.mockResolvedValue(5);
    const num = await docNumbers.generatePrepaidNumber(req, tx);
    expect(num).toBe('PPD-000006');
  });

  test('fallback uses company scope in count query', async () => {
    mockGenerateDocumentNumber.mockResolvedValue(null);
    mockPrepaidCount.mockResolvedValue(0);
    await docNumbers.generatePrepaidNumber(req, tx);
    expect(mockPrepaidCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 1 }) })
    );
  });
});

describe('prepaidDocumentNumber.service — generatePostingBatchNumber', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns company batch number when series available', async () => {
    mockGenerateDocumentNumber.mockResolvedValue('PPB-2026-00001');
    const num = await docNumbers.generatePostingBatchNumber(req, tx);
    expect(num).toBe('PPB-2026-00001');
    expect(mockGenerateDocumentNumber).toHaveBeenCalledWith({
      companyId: 1,
      documentType: 'prepaid_posting_batch',
      transaction: tx,
    });
  });

  test('falls back to PPB- padded count', async () => {
    mockGenerateDocumentNumber.mockResolvedValue(null);
    mockBatchCount.mockResolvedValue(12);
    const num = await docNumbers.generatePostingBatchNumber(req, tx);
    expect(num).toBe('PPB-000013');
  });
});
