jest.mock('../../../models', () => ({
  PayrollEosConfiguration: { findAll: jest.fn() },
  PayrollEosRuleTier: {},
}));

const { PayrollEosConfiguration } = require('../../../models');
const { calculateEOS } = require('../../../services/payroll/payrollEOSService');

describe('calculateEOS integration', () => {
  test('ineligible below minimum service', async () => {
    PayrollEosConfiguration.findAll.mockResolvedValue([
      {
        id: 1,
        contractType: 'ALL',
        minimumServiceMonths: 12,
        gratuityFormulaType: 'FIXED',
        fixedGratuityDays: 21,
        fixedGratuityRate: null,
        tiers: [],
      },
    ]);
    const r = await calculateEOS({
      companyId: 1,
      employee: { joiningDate: '2025-06-01', contractType: 'UNLIMITED' },
      separation: { lastWorkingDay: '2025-12-01', separationType: 'RESIGNATION' },
      salaryStructure: { lines: [{ amount: 6000, component: { componentCode: 'BASIC' } }] },
    });
    expect(r.eligible).toBe(false);
  });

  test('FIXED formula produces amount', async () => {
    PayrollEosConfiguration.findAll.mockResolvedValue([
      {
        id: 1,
        contractType: 'ALL',
        minimumServiceMonths: 0,
        gratuityFormulaType: 'FIXED',
        fixedGratuityDays: 21,
        fixedGratuityRate: null,
        tiers: [],
      },
    ]);
    const r = await calculateEOS({
      companyId: 1,
      employee: { joiningDate: '2020-01-01', contractType: 'UNLIMITED' },
      separation: { lastWorkingDay: '2025-01-01', separationType: 'RESIGNATION' },
      salaryStructure: { lines: [{ amount: 6000, component: { componentCode: 'BASIC' } }] },
    });
    expect(r.eligible).toBe(true);
    expect(r.amount).toBeGreaterThan(0);
  });

  test('no config returns zero', async () => {
    PayrollEosConfiguration.findAll.mockResolvedValue([]);
    const r = await calculateEOS({
      companyId: 1,
      employee: { joiningDate: '2020-01-01' },
      separation: { lastWorkingDay: '2025-01-01', separationType: 'RESIGNATION' },
      salaryStructure: { lines: [{ amount: 6000, component: { componentCode: 'BASIC' } }] },
    });
    expect(r.amount).toBe(0);
    expect(r.eligible).toBe(false);
  });
});
