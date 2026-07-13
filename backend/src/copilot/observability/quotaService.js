'use strict';

const { Op } = require('sequelize');
const { CopilotMessage } = require('../../models');
const { getCopilotConfig } = require('../config/copilotConfig');

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfUtcMonth(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/**
 * Enforce per-user daily and per-company monthly message quotas.
 * Returns { ok: true } or { ok: false, code, message, usage }.
 */
async function checkMessageQuota({ companyId, userId }) {
  const cfg = getCopilotConfig();
  const dayStart = startOfUtcDay();
  const monthStart = startOfUtcMonth();

  const [userToday, companyMonth] = await Promise.all([
    CopilotMessage.count({
      where: {
        companyId,
        userId,
        role: 'user',
        createdAt: { [Op.gte]: dayStart },
      },
    }),
    CopilotMessage.count({
      where: {
        companyId,
        role: 'user',
        createdAt: { [Op.gte]: monthStart },
      },
    }),
  ]);

  const usage = {
    userToday,
    userDailyLimit: cfg.userDailyMessageQuota,
    companyMonth,
    companyMonthlyLimit: cfg.companyMonthlyMessageQuota,
  };

  if (userToday >= cfg.userDailyMessageQuota) {
    return {
      ok: false,
      code: 'USER_DAILY_QUOTA_EXCEEDED',
      message: `Daily Copilot message quota exceeded (${cfg.userDailyMessageQuota}).`,
      usage,
    };
  }
  if (companyMonth >= cfg.companyMonthlyMessageQuota) {
    return {
      ok: false,
      code: 'COMPANY_MONTHLY_QUOTA_EXCEEDED',
      message: `Company monthly Copilot message quota exceeded (${cfg.companyMonthlyMessageQuota}).`,
      usage,
    };
  }
  return { ok: true, usage };
}

module.exports = {
  checkMessageQuota,
  startOfUtcDay,
  startOfUtcMonth,
};
