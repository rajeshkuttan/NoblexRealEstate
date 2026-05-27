const { Op } = require('sequelize');
const {
  PayrollRun,
  PayrollFinalSettlement,
  PayrollAccountConfiguration,
  AccountsTrans,
  EmployeeLoan,
} = require('../../models');
const { round2 } = require('./payrollFinancePostingUtils');

async function getReconciliation(companyId) {
  const exceptions = [];

  const config = await PayrollAccountConfiguration.findOne({ where: { companyId, active: true } });
  if (!config) {
    exceptions.push({ type: 'MISSING_ACCOUNT_CONFIG', message: 'No active payroll account configuration' });
  }

  const unpostedRuns = await PayrollRun.count({
    where: {
      companyId,
      status: { [Op.in]: ['APPROVED', 'LOCKED'] },
      financePostingStatus: 'UNPOSTED',
    },
  });

  const unpostedSettlements = await PayrollFinalSettlement.count({
    where: { companyId, status: 'LOCKED', financePostingStatus: 'UNPOSTED' },
  });

  let payrollPayableBalance = 0;
  if (config?.payrollPayableAccount) {
    const rows = await AccountsTrans.findAll({
      where: { companyId, ledgerId: config.payrollPayableAccount },
      attributes: ['debitAmount', 'creditAmount'],
    });
    for (const r of rows) {
      payrollPayableBalance += Number(r.creditAmount || 0) - Number(r.debitAmount || 0);
    }
    payrollPayableBalance = round2(payrollPayableBalance);
  }

  const activeLoans = await EmployeeLoan.findAll({
    where: { companyId, status: 'ACTIVE' },
    attributes: ['id', 'employeeId', 'balance'],
  });
  const loanBalanceTotal = round2(activeLoans.reduce((s, l) => s + Number(l.balance || 0), 0));

  const negativeSettlements = await PayrollFinalSettlement.findAll({
    where: { companyId, netSettlement: { [Op.lt]: 0 }, status: { [Op.ne]: 'CANCELLED' } },
    limit: 10,
  });
  for (const s of negativeSettlements) {
    exceptions.push({
      type: 'NEGATIVE_SETTLEMENT',
      settlement_id: s.id,
      net: s.netSettlement,
    });
  }

  if (unpostedRuns > 0) {
    exceptions.push({ type: 'UNPOSTED_PAYROLL_RUNS', count: unpostedRuns });
  }
  if (unpostedSettlements > 0) {
    exceptions.push({ type: 'UNPOSTED_SETTLEMENTS', count: unpostedSettlements });
  }

  return {
    payroll_payable_balance: payrollPayableBalance,
    employee_loan_balance_total: loanBalanceTotal,
    unposted_runs: unpostedRuns,
    unposted_settlements: unpostedSettlements,
    has_config: !!config,
    exceptions,
  };
}

async function getDashboard(companyId) {
  const recon = await getReconciliation(companyId);
  const postedRuns = await PayrollRun.count({
    where: { companyId, financePostingStatus: 'POSTED' },
  });
  return {
    ...recon,
    posted_runs: postedRuns,
    eos_liability: 0,
    total_settlement_posted: await PayrollFinalSettlement.count({
      where: { companyId, financePostingStatus: 'POSTED' },
    }),
  };
}

module.exports = { getReconciliation, getDashboard };
