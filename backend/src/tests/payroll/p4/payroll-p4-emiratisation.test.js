jest.mock('../../../models', () => ({
  Employee: { findAll: jest.fn() },
}));

const { Employee } = require('../../../models');
const { getEmiratisationMetrics } = require('../../../services/payroll/emiratisationService');

describe('emiratisationService', () => {
  afterEach(() => jest.clearAllMocks());

  test('counts uae_national flag', async () => {
    Employee.findAll.mockResolvedValue([
      { uaeNational: true, nationality: 'India' },
      { uaeNational: false, nationality: 'India' },
      { uaeNational: false, nationality: 'UAE' },
    ]);
    const m = await getEmiratisationMetrics(1, { requiredPercent: 2 });
    expect(m.total).toBe(3);
    expect(m.uae_nationals).toBe(2);
    expect(m.actual_percent).toBeCloseTo(66.67, 1);
  });

  test('gap when below required', async () => {
    Employee.findAll.mockResolvedValue([{ uaeNational: false, nationality: 'India' }]);
    const m = await getEmiratisationMetrics(1, { requiredPercent: 10 });
    expect(m.gap).toBeGreaterThan(0);
  });

  test('zero employees yields 0 percent', async () => {
    Employee.findAll.mockResolvedValue([]);
    const m = await getEmiratisationMetrics(1);
    expect(m.actual_percent).toBe(0);
  });

  test('Emirati nationality match', async () => {
    Employee.findAll.mockResolvedValue([{ uaeNational: false, nationality: 'Emirati' }]);
    const m = await getEmiratisationMetrics(1);
    expect(m.uae_nationals).toBe(1);
  });
});
