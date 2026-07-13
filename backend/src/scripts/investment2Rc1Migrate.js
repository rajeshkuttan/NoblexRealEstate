'use strict';

/**
 * RC1 live migration — requires CONFIRM_LIVE_INVESTMENT2_MIGRATION=YES
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../config/database');
const { migrateAllCompanies, migrateCompany } = require('../services/investment/migration/rc1Migrate.service');

async function main() {
  if (String(process.env.CONFIRM_LIVE_INVESTMENT2_MIGRATION || '') !== 'YES') {
    console.error('Refusing migrate: set CONFIRM_LIVE_INVESTMENT2_MIGRATION=YES');
    process.exit(2);
  }
  const companyId = process.env.COMPANY_ID ? Number(process.env.COMPANY_ID) : null;
  const since = process.env.SINCE || null;
  console.log('Investment2 RC1 migration LIVE starting…');
  const result = companyId
    ? await migrateCompany(companyId, { dryRun: false, since })
    : await migrateAllCompanies({ dryRun: false, since });
  console.log(JSON.stringify(result, null, 2));
  await sequelize.close().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
