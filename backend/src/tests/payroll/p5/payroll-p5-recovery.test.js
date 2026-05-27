jest.mock('../../../models', () => ({
  EmployeeLoan: { findAll: jest.fn() },
  PayrollMonthlyAdjustment: { findAll: jest.fn() },
}));

const { EmployeeLoan, PayrollMonthlyAdjustment } = require('../../../models');
const { calculateRecoveries } = require('../../../services/payroll/payrollSettlementRecoveryService');

describe('payrollSettlementRecoveryService', () => {
  test('sums loan balances and adjustments', async () => {
    EmployeeLoan.findAll.mockResolvedValue([{ id: 1, balance: 5000 }]);
    PayrollMonthlyAdjustment.findAll.mockResolvedValue([
      { id: 2, amount: 200, reason: 'Advance', adjustmentType: 'DEDUCTION' },
    ]);
    const r = await calculateRecoveries({ companyId: 1, employeeId: 10 });
    expect(r.total).toBe(5200);
    expect(r.items).toHaveLength(2);
  });
});
