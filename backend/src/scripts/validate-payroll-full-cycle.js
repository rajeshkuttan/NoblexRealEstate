#!/usr/bin/env node
/**
 * Validates payroll full-cycle demo data for Concord Real Estate.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../models');
const { buildContext } = require('./payroll-full-cycle/context');
const { logCompanyBanner } = require('./payroll-full-cycle/safety');
const { runAllValidations } = require('./payroll-full-cycle/validators');

async function runPayrollFullCycleValidation(options = {}) {
  const ctx = await buildContext(options);
  logCompanyBanner(ctx.company);
  const { results, overallPass } = await runAllValidations(ctx);

  console.log('\nPayroll Full Cycle Validation\n');
  const seen = new Set();
  for (const r of results) {
    if (seen.has(r.name)) continue;
    seen.add(r.name);
    console.log(`${r.name}: ${r.pass ? 'PASS' : 'FAIL'}${r.message ? ` — ${r.message}` : ''}`);
  }
  console.log(`\nOverall: ${overallPass ? 'PASS' : 'FAIL'}\n`);
  return { overallPass, results, ctx };
}

async function main() {
  try {
    await sequelize.authenticate();
    const { overallPass } = await runPayrollFullCycleValidation();
    process.exit(overallPass ? 0 : 1);
  } catch (e) {
    console.error('\nValidation error:', e.message);
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

module.exports = { runPayrollFullCycleValidation };
