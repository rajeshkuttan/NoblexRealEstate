const { Op } = require('sequelize');
const { EmployeeLoan, PayrollMonthlyAdjustment } = require('../../models');
const { round2 } = require('./payrollSettlementUtils');

async function calculateRecoveries({ companyId, employeeId }) {
  const items = [];
  let total = 0;

  const loans = await EmployeeLoan.findAll({
    where: { companyId, employeeId, status: 'ACTIVE' },
  });

  for (const loan of loans) {
    const balance = Number(loan.balance || 0);
    if (balance > 0) {
      items.push({
        type: 'LOAN_RECOVERY',
        reference_id: loan.id,
        name: `Loan #${loan.id}`,
        amount: round2(balance),
      });
      total += balance;
    }
  }

  const adjustments = await PayrollMonthlyAdjustment.findAll({
    where: {
      companyId,
      employeeId,
      status: 'APPROVED',
      adjustmentType: 'DEDUCTION',
    },
  });

  for (const adj of adjustments) {
    const amt = Number(adj.amount || 0);
    if (amt > 0) {
      items.push({
        type: 'ADJUSTMENT',
        reference_id: adj.id,
        name: adj.reason || `Adjustment #${adj.id}`,
        amount: round2(amt),
      });
      total += amt;
    }
  }

  return { items, total: round2(total) };
}

module.exports = { calculateRecoveries };
