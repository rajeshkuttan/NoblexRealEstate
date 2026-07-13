'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../config/database');
const models = require('../models');
const { reconcileCompany, writeEvidencePack } = require('../services/investment/migration/rc1Reconcile.service');

async function main() {
  const releaseRoot = path.join(__dirname, '../../../Tasks/Release');
  const companyId = process.env.COMPANY_ID ? Number(process.env.COMPANY_ID) : null;
  const companies = companyId
    ? [{ id: companyId }]
    : await models.CompanySetting.findAll({ attributes: ['id'], order: [['id', 'ASC']] });

  const results = [];
  for (const c of companies) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await reconcileCompany(c.id, { batchId: process.env.BATCH_ID ? Number(process.env.BATCH_ID) : null }));
  }
  const written = await writeEvidencePack(results, releaseRoot);
  console.log(JSON.stringify({ results, written }, null, 2));
  await sequelize.close().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
