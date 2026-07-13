'use strict';

/**
 * Capture company-wise investment baseline counts for RC1.
 * Output: Tasks/Release/evidence/investment2-rc1-baseline.json
 *         Tasks/Release/Investment2_RC1_Baseline.md
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../config/database');
const models = require('../models');

const RELEASE = path.join(__dirname, '../../../Tasks/Release');
const EVIDENCE = path.join(RELEASE, 'evidence');

async function countModel(Model, where = {}) {
  if (!Model) return null;
  try {
    return await Model.count({ where });
  } catch (_e) {
    return null;
  }
}

async function companyBaseline(companyId) {
  const {
    InvestmentAsset,
    InvestmentHolding,
    InvestmentTransaction,
    InvestmentValuationHistory,
    InvestmentPartnerAllocation,
    InvestmentDistribution,
    InvestmentDistributionLine,
    InvestmentDocument,
    InvestmentHoldingV2,
    InvestmentInstrument,
    InvestmentPortfolio,
    InvestmentOrder,
    InvestmentTrade,
  } = models;

  const posted = await countModel(InvestmentTransaction, { companyId, postingStatus: 'POSTED' });
  const unposted = await countModel(InvestmentTransaction, {
    companyId,
    postingStatus: ['DRAFT', 'APPROVED'],
  });
  const withJv = InvestmentTransaction
    ? await InvestmentTransaction.count({
        where: { companyId, journalVoucherId: { [require('sequelize').Op.ne]: null } },
      }).catch(() => null)
    : null;
  const testAssets = await countModel(InvestmentAsset, { companyId, isTestData: true });

  return {
    companyId,
    assets: await countModel(InvestmentAsset, { companyId }),
    holdingsLegacy: await countModel(InvestmentHolding, { companyId }),
    holdingsV2: await countModel(InvestmentHoldingV2, { companyId }),
    instruments: await countModel(InvestmentInstrument, { companyId }),
    portfolios: await countModel(InvestmentPortfolio, { companyId }),
    transactions: await countModel(InvestmentTransaction, { companyId }),
    postedTransactions: posted,
    unpostedTransactions: unposted,
    journalLinkedTransactions: withJv,
    valuations: await countModel(InvestmentValuationHistory, { companyId }),
    allocations: await countModel(InvestmentPartnerAllocation, { companyId }),
    distributions: await countModel(InvestmentDistribution, { companyId }),
    distributionLines: await countModel(InvestmentDistributionLine, { companyId }),
    documents: await countModel(InvestmentDocument, { companyId }),
    orders: await countModel(InvestmentOrder, { companyId }),
    trades: await countModel(InvestmentTrade, { companyId }),
    testAssets,
  };
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const companies = await models.CompanySetting.findAll({
    attributes: ['id', 'companyName', 'name'].filter(Boolean),
    order: [['id', 'ASC']],
  }).catch(() => models.CompanySetting.findAll({ order: [['id', 'ASC']] }));

  const companyRows = [];
  for (const c of companies) {
    // eslint-disable-next-line no-await-in-loop
    companyRows.push(await companyBaseline(c.id));
  }

  const snapshot = {
    capturedAt: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    host: process.env.DB_HOST || null,
    database: process.env.DB_NAME || null,
    companies: companyRows,
  };

  const jsonPath = path.join(EVIDENCE, 'investment2-rc1-baseline.json');
  fs.writeFileSync(jsonPath, JSON.stringify(snapshot, null, 2));

  const lines = [
    '# Investment2 RC1 Baseline',
    '',
    `**Captured:** ${snapshot.capturedAt}`,
    `**Environment:** ${snapshot.environment}`,
    `**Database:** ${snapshot.database || 'n/a'}`,
    '',
    '| Company | Assets | Holdings | Txns | Posted | JV links | V2 Holdings | Instruments |',
    '|---------|--------|----------|------|--------|----------|-------------|-------------|',
  ];
  for (const r of companyRows) {
    lines.push(
      `| ${r.companyId} | ${r.assets} | ${r.holdingsLegacy} | ${r.transactions} | ${r.postedTransactions} | ${r.journalLinkedTransactions} | ${r.holdingsV2} | ${r.instruments} |`
    );
  }
  lines.push('', `JSON: \`${jsonPath}\``, '');
  const mdPath = path.join(RELEASE, 'Investment2_RC1_Baseline.md');
  fs.writeFileSync(mdPath, lines.join('\n'));

  console.log(`Baseline written:\n  ${jsonPath}\n  ${mdPath}`);
  await sequelize.close().catch(() => {});
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
