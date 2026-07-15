'use strict';

const mockScheduleCount = jest.fn();
const mockScheduleFindAll = jest.fn();
const mockLineCount = jest.fn();

jest.mock('../../models', () => ({
  LeaseRevenueSchedule: {
    count: (...a) => mockScheduleCount(...a),
    findAll: (...a) => mockScheduleFindAll(...a),
  },
  LeaseRevenueScheduleLine: {
    count: (...a) => mockLineCount(...a),
  },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
}));

const dashboard = require('../../services/leaseRevenue/leaseRevenueDashboard.service');

const req = { companyId: 1 };

describe('leaseRevenueDashboard.service — getDashboardKpis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockScheduleCount.mockResolvedValue(4);
    mockScheduleFindAll
      .mockResolvedValueOnce([
        { deferredBalance: '10000.50', remainingAmount: '9000' },
        { deferredBalance: null, remainingAmount: '2500.00' },
      ])
      .mockResolvedValueOnce([
        { recognizedAmount: '5000' },
        { recognizedAmount: '1500.25' },
      ]);
    mockLineCount.mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(7);
  });

  test('returns expected aggregate shape', async () => {
    const kpis = await dashboard.getDashboardKpis(req);
    expect(kpis).toEqual(
      expect.objectContaining({
        activeCount: 4,
        remainingTotal: expect.any(String),
        recognizedTotal: expect.any(String),
        dueThisMonth: expect.any(Number),
        exceptions: expect.any(Number),
        postingQueue: expect.any(Number),
      })
    );
  });

  test('sums deferred/remaining amounts from active schedules', async () => {
    const kpis = await dashboard.getDashboardKpis(req);
    expect(kpis.remainingTotal).toBe('12500.50');
  });

  test('sums recognized amounts including fully recognized', async () => {
    const kpis = await dashboard.getDashboardKpis(req);
    expect(kpis.recognizedTotal).toBe('6500.25');
  });

  test('queries active statuses for count', async () => {
    await dashboard.getDashboardKpis(req);
    expect(mockScheduleCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 1 }),
      })
    );
  });

  test('counts due lines, exceptions, and posting queue', async () => {
    const kpis = await dashboard.getDashboardKpis(req);
    expect(kpis.dueThisMonth).toBe(3);
    expect(kpis.exceptions).toBe(1);
    expect(kpis.postingQueue).toBe(7);
  });
});
