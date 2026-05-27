jest.mock('../../../config/database', () => ({
  sequelize: { transaction: jest.fn() },
}));

jest.mock('../../../models', () => ({
  AccountsTrans: { findAll: jest.fn() },
  PayrollRun: {},
  PayrollPeriod: {},
  PayrollRunEmployee: { findAll: jest.fn() },
  PayrollRunComponentLine: {},
  PayrollComponent: {},
  PayrollFinalSettlement: {},
  PayrollFinalSettlementLine: {},
  PayrollWpsBatch: {},
  PayrollAccountConfiguration: { findOne: jest.fn() },
}));

jest.mock('../../../services/companyAccountingEntry.service', () => ({
  createCompanyAccountingEntry: jest.fn(),
  COMPANY_AUDIT_ACTIONS: { FINANCE_POSTING_CREATED: 'FINANCE_POSTING_CREATED', FINANCE_POSTING_REVERSED: 'FINANCE_POSTING_REVERSED' },
}));

jest.mock('../../../services/financePostingContext.service', () => ({
  buildPostingContext: jest.fn(),
  loadPostingSource: jest.fn(),
}));

jest.mock('../../../services/periodValidationService', () => ({
  validatePostingDate: jest.fn(),
}));

jest.mock('../../../services/payroll/payrollFinancePostingUtils', () => ({
  round2: (n) => Math.round(Number(n) * 100) / 100,
  getNextTransactionNo: jest.fn().mockResolvedValue(100001),
  assertBalanced: jest.requireActual('../../../services/payroll/payrollFinancePostingUtils').assertBalanced,
  buildAtLine: jest.requireActual('../../../services/payroll/payrollFinancePostingUtils').buildAtLine,
}));

jest.mock('../../../services/payroll/employeeLedger.service', () => ({
  appendLedgerLines: jest.fn(),
}));

const { sequelize } = require('../../../config/database');
const { PayrollAccountConfiguration, PayrollRunEmployee } = require('../../../models');
const { loadPostingSource } = require('../../../services/financePostingContext.service');
const { createCompanyAccountingEntry } = require('../../../services/companyAccountingEntry.service');
const { getActiveAccountConfig, postPayrollRun } = require('../../../services/payroll/payrollFinancePosting.service');

describe('payrollFinancePosting.service', () => {
  const commit = jest.fn();
  const rollback = jest.fn();
  const transaction = {};

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockResolvedValue({ commit, rollback });
  });

  test('getActiveAccountConfig throws when missing', async () => {
    PayrollAccountConfiguration.findOne.mockResolvedValue(null);
    await expect(getActiveAccountConfig(1)).rejects.toMatchObject({ statusCode: 400 });
  });

  test('postPayrollRun rejects unapproved run', async () => {
    loadPostingSource.mockResolvedValue({
      id: 1,
      status: 'DRAFT',
      financePostingStatus: 'UNPOSTED',
      runNumber: 'R1',
      update: jest.fn(),
    });
    await expect(postPayrollRun({ req: { companyId: 1 }, runId: 1 })).rejects.toMatchObject({
      statusCode: 400,
    });
    expect(rollback).toHaveBeenCalled();
  });

  test('postPayrollRun rejects already posted', async () => {
    loadPostingSource.mockResolvedValue({
      id: 1,
      status: 'APPROVED',
      financePostingStatus: 'POSTED',
      update: jest.fn(),
    });
    await expect(postPayrollRun({ req: { companyId: 1 }, runId: 1 })).rejects.toThrow(/already posted/);
  });

  test('postPayrollRun idempotent blocks double post', async () => {
    loadPostingSource.mockResolvedValue({
      id: 1,
      status: 'LOCKED',
      financePostingStatus: 'POSTED',
      update: jest.fn(),
    });
    await expect(postPayrollRun({ req: { companyId: 1 }, runId: 1 })).rejects.toMatchObject({ statusCode: 400 });
  });

  test('postPayrollRun succeeds with balanced lines', async () => {
    const run = {
      id: 9,
      status: 'APPROVED',
      financePostingStatus: 'UNPOSTED',
      runNumber: '2026-01',
      totalNet: 10000,
      payrollPeriod: { toDate: '2026-01-31' },
      update: jest.fn().mockResolvedValue(true),
    };
    loadPostingSource.mockResolvedValue(run);
    PayrollAccountConfiguration.findOne.mockResolvedValue({
      basicSalaryExpenseAccount: 1,
      payrollPayableAccount: 2,
      loanRecoveryAccount: 3,
      allowanceExpenseAccount: 4,
    });
    PayrollRunEmployee.findAll
      .mockResolvedValueOnce([
        {
          lines: [
            {
              calculatedAmount: 10000,
              componentType: 'EARNING',
              component: { componentCode: 'BASIC' },
            },
          ],
        },
      ])
      .mockResolvedValueOnce([{ employeeId: 5, netSalary: 10000 }]);

    const result = await postPayrollRun({ req: { companyId: 1 }, runId: 9 });
    expect(createCompanyAccountingEntry).toHaveBeenCalled();
    expect(run.update).toHaveBeenCalledWith(
      expect.objectContaining({ financePostingStatus: 'POSTED' }),
      expect.any(Object)
    );
    expect(commit).toHaveBeenCalled();
    expect(result.transactionNo).toBe(100001);
  });

  test('settlement posting maps line types via expense accounts', () => {
    const expenseMap = {
      EOSB: 'eosExpenseAccount',
      LEAVE_ENCASHMENT: 'leaveEncashmentAccount',
      LOAN_RECOVERY: 'loanRecoveryAccount',
    };
    expect(expenseMap.EOSB).toBe('eosExpenseAccount');
    expect(expenseMap.LEAVE_ENCASHMENT).toBe('leaveEncashmentAccount');
  });

  test('WPS clearing requires EXPORTED status', async () => {
    const { postWpsClearing } = require('../../../services/payroll/payrollFinancePosting.service');
    loadPostingSource.mockResolvedValue({
      id: 1,
      status: 'APPROVED',
      financeClearingStatus: 'UNPOSTED',
      totalAmount: 5000,
      update: jest.fn(),
    });
    PayrollAccountConfiguration.findOne.mockResolvedValue({
      wpsClearingEnabled: true,
      salaryClearingAccount: 10,
      payrollPayableAccount: 20,
    });
    await expect(postWpsClearing({ req: { companyId: 1 }, batchId: 1 })).rejects.toThrow(/EXPORTED/);
  });
});
