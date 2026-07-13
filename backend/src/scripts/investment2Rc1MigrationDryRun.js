'use strict';

/**
 * RC1 migration dry-run (no durable V2 writes / rolls back).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../config/database');
const { migrateAllCompanies, migrateCompany } = require('../services/investment/migration/rc1Migrate.service');

async function main() {
  const companyId = process.env.COMPANY_ID ? Number(process.env.COMPANY_ID) : null;
  console.log('Investment2 RC1 migration DRY-RUN starting…');
  const result = companyId
    ? await migrateCompany(companyId, { dryRun: true })
    : await migrateAllCompanies({ dryRun: true });
  console.log(JSON.stringify(result, null, 2));
  await sequelize.close().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
