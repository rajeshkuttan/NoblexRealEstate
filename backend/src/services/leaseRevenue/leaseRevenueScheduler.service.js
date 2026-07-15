'use strict';

const cron = require('node-cron');
const { CompanySetting } = require('../../models');
const postingService = require('./leaseRevenuePosting.service');
const revenueService = require('./leaseRevenue.service');

let scheduled = false;

function buildReq(companyId) {
  return { companyId, user: { id: 1, role: 'admin' }, userPermissions: ['module:lease_revenue:auto_post'] };
}

async function runLeaseRevenueCronForCompany(companyId) {
  const req = buildReq(companyId);
  const settings = await revenueService.getSettings(req);
  if (settings.settingsJson?.scheduler_enabled === false) return { companyId, skipped: true };

  await postingService.markDueLines(req);
  const mode = settings.defaultPostingMode || settings.settingsJson?.posting_mode;
  if (mode === 'MANUAL') return { companyId, markedDue: true };

  const results = await postingService.runAutoDraftForDueLines(req);
  return { companyId, processed: results.length, results };
}

async function runLeaseRevenueCronJob() {
  const companies = await CompanySetting.findAll({ where: { isActive: true }, attributes: ['id'] });
  const summary = [];
  for (const c of companies) {
    try {
      summary.push(await runLeaseRevenueCronForCompany(c.id));
    } catch (err) {
      summary.push({ companyId: c.id, error: err.message });
    }
  }
  return summary;
}

function startLeaseRevenueScheduler() {
  if (scheduled) return;
  if (process.env.LEASE_REVENUE_CRON_ENABLED !== '1') {
    console.log('ℹ️ Lease revenue cron disabled (set LEASE_REVENUE_CRON_ENABLED=1)');
    return;
  }

  const scheduleExpr = process.env.LEASE_REVENUE_CRON_SCHEDULE || '0 8 * * *';
  cron.schedule(scheduleExpr, async () => {
    try {
      const summary = await runLeaseRevenueCronJob();
      console.log('✅ Lease revenue scheduler completed', { companies: summary.length });
    } catch (err) {
      console.error('Lease revenue cron error:', err.message);
    }
  });

  scheduled = true;
  console.log(`✅ Lease revenue cron registered (${scheduleExpr})`);
}

module.exports = {
  startLeaseRevenueScheduler,
  runLeaseRevenueCronJob,
  runLeaseRevenueCronForCompany,
};
