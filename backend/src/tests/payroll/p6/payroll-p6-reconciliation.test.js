jest.mock('../../../models', () => ({
  PayrollRun: { count: jest.fn() },
  PayrollFinalSettlement: { count: jest.fn(), findAll: jest.fn() },
  PayrollAccountConfiguration: { findOne: jest.fn() },
  AccountsTrans: { findAll: jest.fn() },
  EmployeeLoan: { findAll: jest.fn() },
}));

const {
  PayrollRun,
  PayrollFinalSettlement,
  PayrollAccountConfiguration,
  AccountsTrans,
  EmployeeLoan,
} = require('../../../models');
const { getReconciliation, getDashboard } = require('../../../services/payroll/payrollReconciliation.service');

describe('payrollReconciliation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PayrollAccountConfiguration.findOne.mockResolvedValue(null);
    PayrollRun.count.mockResolvedValue(2);
    PayrollFinalSettlement.count.mockResolvedValue(1);
    PayrollFinalSettlement.findAll.mockResolvedValue([]);
    AccountsTrans.findAll.mockResolvedValue([]);
    EmployeeLoan.findAll.mockResolvedValue([]);
  });

  test('flags missing account config', async () => {
    const r = await getReconciliation(1);
    expect(r.exceptions.some((e) => e.type === 'MISSING_ACCOUNT_CONFIG')).toBe(true);
    expect(r.has_config).toBe(false);
  });

  test('reports unposted runs', async () => {
    PayrollAccountConfiguration.findOne.mockResolvedValue({ payrollPayableAccount: 99 });
    const r = await getReconciliation(1);
    expect(r.unposted_runs).toBe(2);
    expect(r.exceptions.some((e) => e.type === 'UNPOSTED_PAYROLL_RUNS')).toBe(true);
  });

  test('computes payable balance from GL', async () => {
    PayrollAccountConfiguration.findOne.mockResolvedValue({ payrollPayableAccount: 10 });
    AccountsTrans.findAll.mockResolvedValue([
      { creditAmount: 5000, debitAmount: 1000 },
      { creditAmount: 2000, debitAmount: 0 },
    ]);
    const r = await getReconciliation(1);
    expect(r.payroll_payable_balance).toBe(6000);
  });

  test('dashboard includes posted run count', async () => {
    PayrollRun.count.mockResolvedValueOnce(2).mockResolvedValueOnce(5);
    const d = await getDashboard(1);
    expect(d.posted_runs).toBe(5);
  });
});
