const { Op } = require('sequelize');
const { PayrollLeaveOpeningBalance, LeaveType } = require('../../models');
const { dailySalary, getBasicMonthlyAmount, round2 } = require('./payrollSettlementUtils');

function isAnnualLeaveType(leaveType) {
  const code = (leaveType?.leaveCode || leaveType?.code || '').toUpperCase();
  const name = (leaveType?.leaveName || leaveType?.name || '').toLowerCase();
  return code.includes('ANNUAL') || name.includes('annual');
}

async function calculateLeaveEncashment({ companyId, employeeId, salaryStructure, lastWorkingDay }) {
  const year = new Date(lastWorkingDay).getFullYear();
  const balances = await PayrollLeaveOpeningBalance.findAll({
    where: { companyId, employeeId, balanceYear: year, status: 'APPROVED' },
    include: [{ model: LeaveType, as: 'leaveType' }],
  });

  let encashableDays = 0;
  const balanceDetails = [];

  for (const bal of balances) {
    const lt = bal.leaveType;
    if (!lt?.isPaid) continue;
    if (!isAnnualLeaveType(lt) && balances.length > 1) continue;
    const available = Number(bal.availableDays || 0);
    if (available > 0) {
      encashableDays += available;
      balanceDetails.push({
        leave_type_id: bal.leaveTypeId,
        available_days: available,
      });
    }
  }

  if (encashableDays === 0 && balances.length === 1 && balances[0].leaveType?.isPaid) {
    encashableDays = Number(balances[0].availableDays || 0);
    balanceDetails.push({
      leave_type_id: balances[0].leaveTypeId,
      available_days: encashableDays,
    });
  }

  const monthly = getBasicMonthlyAmount(salaryStructure);
  const daily = dailySalary(monthly);
  const amount = round2(daily * encashableDays);

  return {
    encashableDays: round2(encashableDays),
    dailySalary: daily,
    monthlySalary: monthly,
    amount,
    balanceDetails,
  };
}

module.exports = { calculateLeaveEncashment, isAnnualLeaveType };
