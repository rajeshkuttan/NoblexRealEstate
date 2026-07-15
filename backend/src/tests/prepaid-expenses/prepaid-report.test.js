'use strict';

const mockExpenseFindAll = jest.fn();
const mockLineFindAll = jest.fn();
const mockReconFindAll = jest.fn();

jest.mock('../../models', () => ({
  PrepaidExpense: { findAll: (...a) => mockExpenseFindAll(...a) },
  PrepaidExpenseScheduleLine: { findAll: (...a) => mockLineFindAll(...a) },
  PrepaidExpenseReconciliation: { findAll: (...a) => mockReconFindAll(...a) },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
}));

const reportService = require('../../services/prepaidExpenses/prepaidReport.service');

const req = { companyId: 1 };

const REPORT_TYPES = [
  'register',
  'schedule',
  'monthly_recognition',
  'remaining',
  'reconciliation',
  'expiring',
  'exceptions',
];

function mockRows(type) {
  if (type === 'register' || type === 'remaining' || type === 'expiring') {
    mockExpenseFindAll.mockResolvedValue([
      {
        prepaidNumber: 'PPD-001',
        status: 'ACTIVE',
        totalAmount: '1000',
        remainingAmount: '500',
        serviceStartDate: '2026-01-01',
        serviceEndDate: '2026-12-31',
        description: 'Insurance',
      },
    ]);
  } else if (type === 'reconciliation') {
    mockReconFindAll.mockResolvedValue([
      {
        reconciliationDate: '2026-06-01',
        prepaidExpenseId: 1,
        differenceAmount: '0.00',
        status: 'MATCHED',
      },
    ]);
  } else {
    mockLineFindAll.mockResolvedValue([
      {
        lineNumber: 1,
        recognitionMonth: '2026-01',
        scheduledAmount: '100',
        postingStatus: 'POSTED',
        periodStartDate: '2026-01-01',
        periodEndDate: '2026-01-31',
        prepaidExpense: { prepaidNumber: 'PPD-001' },
      },
    ]);
  }
}

describe('prepaidReport.service — json format', () => {
  beforeEach(() => jest.clearAllMocks());

  for (const type of REPORT_TYPES) {
    test(`${type} returns json body without crashing`, async () => {
      mockRows(type);
      const result = await reportService.generateReport(req, type, { format: 'json' });
      expect(result.contentType).toBe('application/json');
      expect(result.body).toEqual(expect.objectContaining({ type, count: expect.any(Number), data: expect.any(Array) }));
    });
  }
});

describe('prepaidReport.service — export formats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExpenseFindAll.mockResolvedValue([
      { prepaidNumber: 'PPD-001', status: 'ACTIVE', totalAmount: '100', remainingAmount: '50', serviceStartDate: '2026-01-01', serviceEndDate: '2026-12-31' },
    ]);
  });

  test('xlsx returns buffer', async () => {
    const result = await reportService.generateReport(req, 'register', { format: 'xlsx' });
    expect(result.contentType).toContain('spreadsheetml');
    expect(Buffer.isBuffer(result.body)).toBe(true);
    expect(result.filename).toBe('prepaid-register.xlsx');
  });

  test('csv returns string', async () => {
    const result = await reportService.generateReport(req, 'register', { format: 'csv' });
    expect(result.contentType).toBe('text/csv');
    expect(typeof result.body).toBe('string');
    expect(result.body.length).toBeGreaterThan(0);
  });

  test('pdf returns buffer', async () => {
    const result = await reportService.generateReport(req, 'register', { format: 'pdf', title: 'Register' });
    expect(result.contentType).toBe('application/pdf');
    expect(Buffer.isBuffer(result.body)).toBe(true);
  });
});

describe('prepaidReport.service — errors', () => {
  test('unknown report type throws 400', async () => {
    await expect(reportService.generateReport(req, 'unknown_type')).rejects.toThrow(/Unknown report type/);
  });

  test('unsupported format throws 400', async () => {
    mockExpenseFindAll.mockResolvedValue([]);
    await expect(reportService.generateReport(req, 'register', { format: 'docx' })).rejects.toThrow(
      /Unsupported format/
    );
  });
});

describe('prepaidReport.service — empty data', () => {
  test('register with no rows still produces xlsx', async () => {
    mockExpenseFindAll.mockResolvedValue([]);
    const result = await reportService.generateReport(req, 'register', { format: 'xlsx' });
    expect(Buffer.isBuffer(result.body)).toBe(true);
  });
});
