'use strict';

/**
 * Seed prepaid expense demo data — demo/test companies only.
 * Usage: node src/scripts/seedPrepaidExpenses.js [--dry-run]
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  CompanySetting,
  ChartOfAccount,
  PrepaidExpenseCategory,
  PrepaidExpense,
} = require('../models');
const { seedMissingNumberSeries } = require('../services/companyNumberSeriesSeed.service');
const expenseService = require('../services/prepaidExpenses/prepaidExpense.service');

const DRY = process.argv.includes('--dry-run');

async function findDemoCompany() {
  return CompanySetting.findOne({
    where: {
      isActive: true,
      [Op.or]: [
        { companyName: { [Op.like]: '%demo%' } },
        { companyName: { [Op.like]: '%test%' } },
      ],
    },
    order: [['id', 'ASC']],
  });
}

async function ensureCoa(companyId, code, name, type) {
  const [acct] = await ChartOfAccount.findOrCreate({
    where: { companyId, accountCode: code },
    defaults: {
      companyId,
      accountCode: code,
      accountName: name,
      accountType: type,
      level: 1,
      isActive: true,
    },
  });
  return acct;
}

async function run() {
  await sequelize.authenticate();
  const company = await findDemoCompany();
  if (!company) {
    console.error('No demo/test company found — aborting seed');
    process.exit(1);
  }

  console.log(`Seeding prepaid expenses for company ${company.id} (${company.companyName}) dry=${DRY}`);

  const req = { companyId: company.id, user: { id: 1, role: 'admin' } };
  await seedMissingNumberSeries(company.id);

  const prepaidAsset = await ensureCoa(company.id, 'PPD-ASSET', 'Prepaid Expenses Demo', 'asset');
  const expenseAcct = await ensureCoa(company.id, 'PPD-EXP', 'Prepaid Rent Expense Demo', 'expense');

  let category = await PrepaidExpenseCategory.findOne({
    where: { companyId: company.id, categoryCode: 'RENT-DEMO' },
  });
  if (!category) {
    category = await expenseService.createCategory(req, {
      categoryCode: 'RENT-DEMO',
      categoryName: 'Demo Prepaid Rent',
      defaultPrepaidAssetAccountId: prepaidAsset.id,
      defaultExpenseAccountId: expenseAcct.id,
    });
  }

  const samples = [
    {
      description: 'Demo prepaid rent — 120k / 365 days',
      totalAmount: 120000,
      serviceStartDate: '2026-01-15',
      serviceEndDate: '2027-01-14',
      prepaidAssetAccountId: prepaidAsset.id,
      expenseAccountId: expenseAcct.id,
      categoryId: category.id,
      isTestData: true,
    },
    {
      description: 'Demo insurance — 6 months',
      totalAmount: 6000,
      serviceStartDate: '2026-01-01',
      serviceEndDate: '2026-06-30',
      prepaidAssetAccountId: prepaidAsset.id,
      expenseAccountId: expenseAcct.id,
      categoryId: category.id,
      isTestData: true,
    },
  ];

  for (const sample of samples) {
    const exists = await PrepaidExpense.findOne({
      where: { companyId: company.id, description: sample.description, isTestData: true },
    });
    if (exists) {
      console.log(`  skip existing: ${sample.description}`);
      continue;
    }
    if (DRY) {
      console.log(`  [dry-run] would create: ${sample.description}`);
      continue;
    }
    const record = await expenseService.createPrepaidExpense(req, sample);
    await expenseService.generateSchedule(req, record.id);
    console.log(`  created ${record.prepaidNumber}: ${sample.description}`);
  }

  console.log('Prepaid expense seed complete (no auto-post)');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
