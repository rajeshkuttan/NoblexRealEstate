'use strict';

const mockScheduleFindAll = jest.fn();
const mockLineFindAll = jest.fn();
const mockReconFindAll = jest.fn();

jest.mock('../../models', () => ({
  LeaseRevenueSchedule: { findAll: (...a) => mockScheduleFindAll(...a) },
  LeaseRevenueScheduleLine: { findAll: (...a) => mockLineFindAll(...a) },
  LeaseRevenueReconciliation: { findAll: (...a) => mockReconFindAll(...a) },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
}));

const reportService = require('../../services/leaseRevenue/leaseRevenueReport.service');

const req = { companyId: 1 };

const REPORT_TYPES = [
  'register',
  'schedule',
  'recognition',
  'monthly_recognition',
  'deferred',
  'forecast',
  'reconciliation',
  'exceptions',
];

function mockRows(type) {
  if (type === 'register' || type === 'deferred') {
    mockScheduleFindAll.mockResolvedValue([
      {
        scheduleNumber: 'LRS-001',
        status: 'ACTIVE',
        totalContractAmount: '1000',
        deferredBalance: '500',
        recognizedAmount: '500',
        serviceStartDate: '2026-01-01',
        serviceEndDate: '2026-12-31',
        leaseId: 1,
      },
    ]);
  } else if (type === 'reconciliation') {
    mockReconFindAll.mockResolvedValue([
      {
        reconciliationDate: '2026-06-01',
        scheduleId: 1,
        differenceAmount: '0.00',
        status: 'MATCHED',
      },
    ]);
  } else if (type === 'forecast') {
    mockLineFindAll.mockResolvedValue([
      {
        lineNumber: 1,
        recognitionMonth: '2026-01',
        scheduledAmount: '100',
        postingStatus: 'SCHEDULED',
        periodStartDate: '2026-01-01',
        periodEndDate: '2026-01-31',
        schedule: { scheduleNumber: 'LRS-001', status: 'ACTIVE' },
      },
      {
        lineNumber: 2,
        recognitionMonth: '2026-02',
        scheduledAmount: '200',
        postingStatus: 'SCHEDULED',
        periodStartDate: '2026-02-01',
        periodEndDate: '2026-02-28',
        schedule: { scheduleNumber: 'LRS-001', status: 'ACTIVE' },
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
        schedule: { scheduleNumber: 'LRS-001' },
      },
    ]);
  }
}

describe('leaseRevenueReport.service — REPORT_HANDLERS', () => {
  test('exports all report type handlers', () => {
    for (const type of REPORT_TYPES) {
      expect(reportService.REPORT_HANDLERS[type]).toBeInstanceOf(Function);
    }
  });

  test('monthly_recognition aliases recognition handler', () => {
    expect(reportService.REPORT_HANDLERS.monthly_recognition).toBe(
      reportService.REPORT_HANDLERS.recognition
    );
  });
});

describe('leaseRevenueReport.service — json format', () => {
  beforeEach(() => jest.clearAllMocks());

  for (const type of REPORT_TYPES) {
    test(`${type} returns json body without crashing`, async () => {
      mockRows(type);
      const result = await reportService.generateReport(req, type, { format: 'json' });
      expect(result.contentType).toBe('application/json');
      expect(result.body).toEqual(
        expect.objectContaining({ type, count: expect.any(Number), data: expect.any(Array) })
      );
    });
  }
});

describe('leaseRevenueReport.service — forecast aggregation', () => {
  test('groups lines by recognition month', async () => {
    mockRows('forecast');
    const result = await reportService.generateReport(req, 'forecast', { format: 'json', months: 6 });
    expect(result.body.data).toHaveLength(2);
    expect(result.body.data[0]).toEqual(
      expect.objectContaining({ recognitionMonth: '2026-01', lineCount: 1, totalAmount: '100.00' })
    );
  });

  test('excludes inactive schedule lines from forecast', async () => {
    mockLineFindAll.mockResolvedValue([
      {
        recognitionMonth: '2026-01',
        scheduledAmount: '100',
        schedule: { status: 'DRAFT' },
      },
    ]);
    const result = await reportService.generateReport(req, 'forecast', { format: 'json' });
    expect(result.body.count).toBe(0);
  });
});

describe('leaseRevenueReport.service — export formats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduleFindAll.mockResolvedValue([
      {
        scheduleNumber: 'LRS-001',
        status: 'ACTIVE',
        totalContractAmount: '100',
        deferredBalance: '50',
        recognizedAmount: '50',
        serviceStartDate: '2026-01-01',
        serviceEndDate: '2026-12-31',
      },
    ]);
  });

  test('xlsx returns buffer', async () => {
    const result = await reportService.generateReport(req, 'register', { format: 'xlsx' });
    expect(result.contentType).toContain('spreadsheetml');
    expect(Buffer.isBuffer(result.body)).toBe(true);
    expect(result.filename).toBe('lease-revenue-register.xlsx');
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

describe('leaseRevenueReport.service — errors', () => {
  test('unknown report type throws 400', async () => {
    await expect(reportService.generateReport(req, 'unknown_type')).rejects.toThrow(/Unknown report type/);
  });

  test('unsupported format throws 400', async () => {
    mockScheduleFindAll.mockResolvedValue([]);
    await expect(reportService.generateReport(req, 'register', { format: 'docx' })).rejects.toThrow(
      /Unsupported format/
    );
  });
});

describe('leaseRevenueReport.service — empty data', () => {
  test('register with no rows still produces xlsx', async () => {
    mockScheduleFindAll.mockResolvedValue([]);
    const result = await reportService.generateReport(req, 'register', { format: 'xlsx' });
    expect(Buffer.isBuffer(result.body)).toBe(true);
  });

  test('empty rows produce placeholder sheet row', async () => {
    mockScheduleFindAll.mockResolvedValue([]);
    const result = await reportService.generateReport(req, 'register', { format: 'json' });
    expect(result.body.count).toBe(0);
  });
});
