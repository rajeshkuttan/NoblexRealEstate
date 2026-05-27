const { dailySalary, getBasicMonthlyAmount, round2 } = require('./payrollSettlementUtils');

const NOTICE_TYPES = new Set(['RESIGNATION', 'TERMINATION']);

function calculateNoticeRecovery({ separation, salaryStructure, eosConfig }) {
  if (eosConfig && eosConfig.noticeRecoveryEnabled === false) {
    return { amount: 0, shortfallDays: 0, skipped: true };
  }

  if (!NOTICE_TYPES.has(separation.separationType)) {
    return { amount: 0, shortfallDays: 0, skipped: true, reason: 'Separation type exempt' };
  }

  const required = Number(separation.noticeDays || 0);
  const served = Number(separation.servedNoticeDays || 0);
  const shortfall = Math.max(0, required - served);

  const monthly = getBasicMonthlyAmount(salaryStructure);
  const daily = dailySalary(monthly);
  const amount = round2(daily * shortfall);

  return {
    amount,
    shortfallDays: shortfall,
    requiredNoticeDays: required,
    servedNoticeDays: served,
    dailySalary: daily,
  };
}

module.exports = { calculateNoticeRecovery };
