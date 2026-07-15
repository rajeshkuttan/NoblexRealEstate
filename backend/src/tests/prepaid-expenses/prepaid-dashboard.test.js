'use strict';

const mockExpenseCount = jest.fn();
const mockExpenseFindAll = jest.fn();
const mockLineCount = jest.fn();

jest.mock('../../models', () => ({
  PrepaidExpense: {
    count: (...a) => mockExpenseCount(...a),
    findAll: (...a) => mockExpenseFindAll(...a),
  },
  PrepaidExpenseScheduleLine: {
    count: (...a) => mockLineCount(...a),
  },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
}));

const dashboard = require('../../services/prepaidExpenses/prepaidDashboard.service');

const req = { companyId: 1 };

describe('prepaidDashboard.service — getDashboardKpis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExpenseCount.mockResolvedValue(4);
    mockExpenseFindAll.mockResolvedValue([
      { remainingAmount: '10000.50' },
      { remainingAmount: '2500.00' },
    ]);
    mockLineCount.mockResolvedValueOnce(3).mockResolvedValueOnce(1).mockResolvedValueOnce(7);
  });

  test('returns expected aggregate shape', async () => {
    const kpis = await dashboard.getDashboardKpis(req);
    expect(kpis).toEqual(
      expect.objectContaining({
        activeCount: 4,
        remainingTotal: expect.any(String),
        dueThisMonth: expect.any(Number),
        exceptions: expect.any(Number),
        postingQueue: expect.any(Number),
      })
    );
  });

  test('sums remaining amounts from active expenses', async () => {
    const kpis = await dashboard.getDashboardKpis(req);
    expect(kpis.remainingTotal).toBe('12500.50');
  });

  test('queries active statuses for count', async () => {
    await dashboard.getDashboardKpis(req);
    expect(mockExpenseCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 1 }),
      })
    );
  });

  test('counts due lines for current month', async () => {
    const kpis = await dashboard.getDashboardKpis(req);
    expect(kpis.dueThisMonth).toBe(3);
    expect(kpis.exceptions).toBe(1);
    expect(kpis.postingQueue).toBe(7);
  });
});
