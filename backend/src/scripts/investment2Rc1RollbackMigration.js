'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../config/database');
const { rollbackBatch } = require('../services/investment/migration/rc1Migrate.service');

async function main() {
  const batchId = Number(process.env.BATCH_ID);
  if (!batchId) {
    console.error('BATCH_ID required');
    process.exit(2);
  }
  if (String(process.env.CONFIRM_LIVE_INVESTMENT2_ROLLBACK || '') !== 'YES') {
    console.error('Set CONFIRM_LIVE_INVESTMENT2_ROLLBACK=YES');
    process.exit(2);
  }
  const result = await rollbackBatch(batchId);
  console.log(JSON.stringify(result, null, 2));
  await sequelize.close().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
