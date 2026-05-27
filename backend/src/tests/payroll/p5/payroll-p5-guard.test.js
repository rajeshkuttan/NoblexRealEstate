const { assertSettlementMutable, SettlementLockedError } = require('../../../services/payroll/payrollFinalSettlementGuard');

describe('payrollFinalSettlementGuard', () => {
  test('allows mutable settlement', () => {
    expect(() => assertSettlementMutable({ status: 'CALCULATED' })).not.toThrow();
  });

  test('blocks LOCKED', () => {
    expect(() => assertSettlementMutable({ status: 'LOCKED' })).toThrow(SettlementLockedError);
  });
});
