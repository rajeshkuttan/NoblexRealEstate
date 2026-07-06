'use strict';

const cron = require('node-cron');
const { CompanySetting } = require('../models');
const { runProviderRefresh } = require('./investment/investmentValuationProvider.service');

let scheduled = false;

function startInvestmentValuationScheduler() {
  if (scheduled) return;
  if (process.env.INVESTMENT_VALUATION_CRON_ENABLED !== '1') {
    console.log('ℹ️ Investment valuation cron disabled (set INVESTMENT_VALUATION_CRON_ENABLED=1)');
    return;
  }

  cron.schedule('0 6 * * *', async () => {
    try {
      const companies = await CompanySetting.findAll({ where: { isActive: true }, attributes: ['id'] });
      for (const c of companies) {
        await runProviderRefresh(c.id);
      }
      console.log('✅ Investment valuation provider refresh job completed');
    } catch (err) {
      console.error('Investment valuation cron error:', err.message);
    }
  });

  scheduled = true;
  console.log('✅ Investment valuation provider cron registered (daily 06:00, disabled providers no-op)');
}

module.exports = { startInvestmentValuationScheduler };
