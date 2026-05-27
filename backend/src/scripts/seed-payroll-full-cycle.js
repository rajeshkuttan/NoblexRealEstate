#!/usr/bin/env node
/**
 * Payroll full-cycle demo seed for Concord Real Estate (fuzzy name match).
 * Usage: npm run seed:payroll-full-cycle [-- --company-id=123]
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../models');
const { buildContext } = require('./payroll-full-cycle/context');
const { assertSeedAllowed, logCompanyBanner } = require('./payroll-full-cycle/safety');
const { buildReq } = require('./payroll-full-cycle/buildReq');
const { runAllPhases } = require('./payroll-full-cycle/phases');

async function runPayrollFullCycleSeed(options = {}) {
  assertSeedAllowed();
  const ctx = await buildContext(options);
  logCompanyBanner(ctx.company);
  const req = buildReq(ctx.companyId, ctx.userId);
  await runAllPhases(ctx, req);
  return ctx;
}

async function main() {
  try {
    await sequelize.authenticate();
    const ctx = await runPayrollFullCycleSeed();
    console.log('\nSeed completed successfully.');
    console.log('Handles:', JSON.stringify(ctx.handles, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('\nSeed failed:', e.message);
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

module.exports = { runPayrollFullCycleSeed };
