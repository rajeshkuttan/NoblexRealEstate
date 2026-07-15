'use strict';

const mockGenerateDocumentNumber = jest.fn();
const mockScheduleCount = jest.fn();
const mockBatchCount = jest.fn();

jest.mock('../../services/companyDocumentNumber.service', () => ({
  generateDocumentNumber: (...a) => mockGenerateDocumentNumber(...a),
}));

jest.mock('../../models', () => ({
  LeaseRevenueSchedule: { count: (...a) => mockScheduleCount(...a) },
  LeaseRevenuePostingBatch: { count: (...a) => mockBatchCount(...a) },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
}));

const docNumbers = require('../../services/leaseRevenue/leaseRevenueDocumentNumber.service');

const req = { companyId: 1 };
const tx = {};

describe('leaseRevenueDocumentNumber.service — generateScheduleNumber', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns company document number when series available', async () => {
    mockGenerateDocumentNumber.mockResolvedValue('LRS-2026-00042');
    const num = await docNumbers.generateScheduleNumber(req, tx);
    expect(num).toBe('LRS-2026-00042');
    expect(mockGenerateDocumentNumber).toHaveBeenCalledWith({
      companyId: 1,
      documentType: 'lease_revenue_schedule',
      transaction: tx,
    });
  });

  test('falls back to LRS- padded count when series empty', async () => {
    mockGenerateDocumentNumber.mockResolvedValue(null);
    mockScheduleCount.mockResolvedValue(5);
    const num = await docNumbers.generateScheduleNumber(req, tx);
    expect(num).toBe('LRS-000006');
  });

  test('fallback uses company scope in count query', async () => {
    mockGenerateDocumentNumber.mockResolvedValue(null);
    mockScheduleCount.mockResolvedValue(0);
    await docNumbers.generateScheduleNumber(req, tx);
    expect(mockScheduleCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ companyId: 1 }) })
    );
  });
});

describe('leaseRevenueDocumentNumber.service — generatePostingBatchNumber', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns company batch number when series available', async () => {
    mockGenerateDocumentNumber.mockResolvedValue('LRB-2026-00001');
    const num = await docNumbers.generatePostingBatchNumber(req, tx);
    expect(num).toBe('LRB-2026-00001');
    expect(mockGenerateDocumentNumber).toHaveBeenCalledWith({
      companyId: 1,
      documentType: 'lease_revenue_batch',
      transaction: tx,
    });
  });

  test('falls back to LRB- padded count', async () => {
    mockGenerateDocumentNumber.mockResolvedValue(null);
    mockBatchCount.mockResolvedValue(12);
    const num = await docNumbers.generatePostingBatchNumber(req, tx);
    expect(num).toBe('LRB-000013');
  });
});
