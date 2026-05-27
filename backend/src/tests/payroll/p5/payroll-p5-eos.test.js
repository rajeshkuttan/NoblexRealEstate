const { calculateRuleBasedGratuity } = require('../../../services/payroll/payrollEOSService');

describe('payrollEOSService', () => {
  test('RULE_BASED tier gratuity from days per year', () => {
    const config = {
      tiers: [
        {
          id: 1,
          serviceYearsFrom: 0,
          serviceYearsTo: null,
          gratuityDaysPerYear: 21,
          appliesToSeparationTypes: null,
        },
      ],
    };
    const result = calculateRuleBasedGratuity(config, 5, 6000, 'RESIGNATION');
    expect(result.amount).toBeGreaterThan(0);
    expect(result.tierDetails.length).toBeGreaterThan(0);
  });

  test('RULE_BASED percent of basic tier', () => {
    const config = {
      tiers: [
        {
          id: 1,
          serviceYearsFrom: 0,
          serviceYearsTo: 5,
          percentOfBasic: 10,
          appliesToSeparationTypes: ['RESIGNATION'],
        },
      ],
    };
    const result = calculateRuleBasedGratuity(config, 3, 10000, 'RESIGNATION');
    expect(result.amount).toBe(3000);
  });

  test('tier filtered by separation type', () => {
    const config = {
      tiers: [
        {
          id: 1,
          serviceYearsFrom: 0,
          serviceYearsTo: null,
          gratuityDaysPerYear: 21,
          appliesToSeparationTypes: ['TERMINATION'],
        },
      ],
    };
    const result = calculateRuleBasedGratuity(config, 5, 6000, 'RESIGNATION');
    expect(result.amount).toBe(0);
  });
});
