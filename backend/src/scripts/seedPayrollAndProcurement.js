#!/usr/bin/env node
/**
 * Seed payroll full-cycle + procurement demo data for one company.
 * Usage: npm run seed:payroll-procurement [-- --company-id=1]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize, CompanySetting } = require('../models');
const { runPayrollFullCycleSeed } = require('./seed-payroll-full-cycle');
const { runProcurementSeed } = require('./seedProcurementData');

function parseCompanyId(argv = process.argv.slice(2)) {
  for (const arg of argv) {
    if (arg.startsWith('--company-id=')) {
      return Number(arg.split('=')[1]);
    }
  }
  return null;
}

async function resolveCompanyId(explicitId) {
  if (explicitId) return explicitId;
  const company = await CompanySetting.findOne({
    where: { isActive: true },
    order: [['id', 'ASC']],
  });
  if (!company) throw new Error('No active company found. Use --company-id=<id>.');
  return company.id;
}

async function main() {
  try {
    await sequelize.authenticate();
    const companyId = await resolveCompanyId(parseCompanyId());

    console.log('\n========== Payroll module seed ==========');
    await runPayrollFullCycleSeed({ companyId });

    console.log('\n========== Procurement module seed ==========');
    await runProcurementSeed({ companyId });

    console.log('\nAll module seeds completed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('\nCombined seed failed:', e.message);
    if (process.env.DEBUG) console.error(e);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch (_) {
      /* ignore */
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
