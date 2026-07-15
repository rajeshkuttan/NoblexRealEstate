'use strict';

const cron = require('node-cron');
const { CompanySetting } = require('../../models');
const postingService = require('./prepaidPosting.service');
const expenseService = require('./prepaidExpense.service');

let scheduled = false;

function buildReq(companyId) {
  return { companyId, user: { id: 1, role: 'admin' } };
}

async function runPrepaidCronForCompany(companyId) {
  const req = buildReq(companyId);
  const settings = await expenseService.getSettings(req);
  if (settings.settingsJson?.scheduler_enabled === false) return { companyId, skipped: true };

  await postingService.markDueLines(req);
  const mode = settings.defaultPostingMode || settings.settingsJson?.posting_mode;
  if (mode === 'MANUAL') return { companyId, markedDue: true };

  const results = await postingService.runAutoDraftForDueLines(req);
  return { companyId, processed: results.length, results };
}

async function runPrepaidCronJob() {
  const companies = await CompanySetting.findAll({ where: { isActive: true }, attributes: ['id'] });
  const summary = [];
  for (const c of companies) {
    try {
      summary.push(await runPrepaidCronForCompany(c.id));
    } catch (err) {
      summary.push({ companyId: c.id, error: err.message });
    }
  }
  return summary;
}

function startPrepaidExpenseScheduler() {
  if (scheduled) return;
  if (process.env.PREPAID_EXPENSE_CRON_ENABLED !== '1') {
    console.log('ℹ️ Prepaid expense cron disabled (set PREPAID_EXPENSE_CRON_ENABLED=1)');
    return;
  }

  const scheduleExpr = process.env.PREPAID_EXPENSE_CRON_SCHEDULE || '0 7 * * *';
  cron.schedule(scheduleExpr, async () => {
    try {
      const summary = await runPrepaidCronJob();
      console.log('✅ Prepaid expense scheduler completed', { companies: summary.length });
    } catch (err) {
      console.error('Prepaid expense cron error:', err.message);
    }
  });

  scheduled = true;
  console.log(`✅ Prepaid expense cron registered (${scheduleExpr})`);
}

module.exports = {
  startPrepaidExpenseScheduler,
  runPrepaidCronJob,
  runPrepaidCronForCompany,
};
