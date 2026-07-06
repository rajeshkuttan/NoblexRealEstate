'use strict';

/**
 * Smoke-test investment seed data and optional finance posting.
 * Run from backend/: node src/scripts/validateInvestmentModule.js
 * Set POST_APPROVED=1 to post all APPROVED (non-POSTED) seed transactions.
 */
const { sequelize } = require('../config/database');
const {
  CompanySetting,
  InvestmentTransaction,
  InvestmentAccountConfiguration,
  AccountsTrans,
} = require('../models');
const postingService = require('../services/investment/investmentPosting.service');

async function main() {
  const company = await CompanySetting.findOne({ where: { isActive: true }, order: [['id', 'ASC']] });
  if (!company) {
    console.error('No active company found');
    process.exit(1);
  }
  const companyId = company.id;
  console.log(`Validating investments for company ${companyId}`);

  const config = await InvestmentAccountConfiguration.findOne({ where: { companyId, active: true } });
  if (!config?.investmentAssetAccount) {
    console.warn('WARN: Investment COA mapping incomplete — configure at /investments/settings');
  } else {
    console.log('OK: Investment account configuration present');
  }

  const txns = await InvestmentTransaction.findAll({
    where: { companyId },
    order: [['transactionNo', 'ASC']],
  });
  console.log(`Found ${txns.length} investment transactions`);

  const phantomPosted = [];
  for (const t of txns) {
    if (t.postingStatus !== 'POSTED') continue;
    const where = t.journalVoucherId
      ? { companyId, jvId: t.journalVoucherId }
      : { companyId, jvNumber: t.transactionNo };
    const count = await AccountsTrans.count({ where });
    if (count === 0) phantomPosted.push(t);
  }
  if (phantomPosted.length) {
    console.warn(`WARN: ${phantomPosted.length} transaction(s) marked POSTED but have no GL lines`);
    phantomPosted.forEach((t) => console.warn(`  - ${t.transactionNo} (${t.transactionType})`));
    if (process.env.FIX_PHANTOM_POSTED === '1') {
      for (const t of phantomPosted) {
        await t.update({ postingStatus: 'APPROVED' });
        console.log(`RESET: ${t.transactionNo} → APPROVED`);
      }
    } else {
      console.log('Re-run with FIX_PHANTOM_POSTED=1 to reset them to APPROVED for re-posting.');
    }
  }

  const byStatus = {};
  for (const t of txns) {
    const key = `${t.approvalStatus}/${t.postingStatus}`;
    byStatus[key] = (byStatus[key] || 0) + 1;
  }
  console.log('Status breakdown:', byStatus);

  const posted = txns.filter((t) => t.postingStatus === 'POSTED');
  let glLines = 0;
  for (const t of posted) {
    const where = t.journalVoucherId
      ? { companyId, jvId: t.journalVoucherId }
      : { companyId, jvNumber: t.transactionNo };
    const count = await AccountsTrans.count({ where });
    glLines += count;
    const jvNote = t.journalVoucherId ? ` JV#${t.journalVoucherId}` : '';
    console.log(`  ${t.transactionNo} (${t.transactionType}): ${count} GL line(s)${jvNote}`);
  }
  console.log(`Total GL lines for posted txns: ${glLines}`);

  if (process.env.POST_APPROVED === '1') {
    const { User } = require('../models');
    const user = await User.findOne({ where: { isActive: true }, order: [['id', 'ASC']] });
    const mockReq = {
      companyId,
      user: user || { id: 1, role: 'admin', isActive: true },
      userRoles: ['admin'],
      userPermissions: ['module:investment:post'],
      headers: {},
    };
    const pending = txns.filter(
      (t) => t.approvalStatus === 'APPROVED' && t.postingStatus !== 'POSTED' && t.postingStatus !== 'CANCELLED'
    );
    for (const t of pending) {
      try {
        await postingService.postTransaction(mockReq, t.id);
        console.log(`POSTED: ${t.transactionNo}`);
      } catch (err) {
        console.error(`FAIL post ${t.transactionNo}:`, err.message);
      }
    }

    const postedAfter = await InvestmentTransaction.findAll({ where: { companyId, postingStatus: 'POSTED' } });
    let glTotal = 0;
    for (const t of postedAfter) {
      const where = t.journalVoucherId
        ? { companyId, jvId: t.journalVoucherId }
        : { companyId, jvNumber: t.transactionNo };
      const count = await AccountsTrans.count({ where });
      glTotal += count;
      console.log(`  GL ${t.transactionNo}: ${count} line(s)${t.journalVoucherId ? ` JV#${t.journalVoucherId}` : ''}`);
    }
    console.log(`Total GL lines: ${glTotal}`);
  } else {
    const ready = txns.filter((t) => t.approvalStatus === 'APPROVED' && t.postingStatus !== 'POSTED');
    if (ready.length) {
      console.log(`\n${ready.length} transaction(s) ready to post. Re-run with POST_APPROVED=1 to post via script.`);
      ready.forEach((t) => console.log(`  - ${t.transactionNo} (${t.transactionType})`));
    }
  }

  await sequelize.close();
  console.log('\nValidation complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
