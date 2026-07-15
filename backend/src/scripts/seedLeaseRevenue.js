'use strict';

/**
 * Seed lease revenue demo data — demo/test companies only.
 * Usage: node src/scripts/seedLeaseRevenue.js [--dry-run]
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  CompanySetting,
  ChartOfAccount,
  Lease,
  LeaseRevenueSchedule,
} = require('../models');
const { seedMissingNumberSeries } = require('../services/companyNumberSeriesSeed.service');
const revenueService = require('../services/leaseRevenue/leaseRevenue.service');

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

  console.log(`Seeding lease revenue for company ${company.id} (${company.companyName}) dry=${DRY}`);

  const req = { companyId: company.id, user: { id: 1, role: 'admin' } };
  await seedMissingNumberSeries(company.id);

  await ensureCoa(company.id, '2520', 'Deferred Rental Income Demo', 'liability');
  await ensureCoa(company.id, '4100', 'Rental Income Demo', 'revenue');
  await ensureCoa(company.id, '1200', 'Accounts Receivable Demo', 'asset');

  const lease = await Lease.findOne({
    where: { companyId: company.id, status: { [Op.in]: ['active', 'renewed'] } },
    order: [['id', 'ASC']],
  });

  if (!lease) {
    console.log('No active lease found — creating manual 120k demo schedule');
    const anyLease = await Lease.findOne({ where: { companyId: company.id }, order: [['id', 'ASC']] });
    if (!anyLease) {
      console.error('No lease records in demo company — cannot seed');
      process.exit(1);
    }
    const deferred = await ensureCoa(company.id, 'LRS-DEF', 'LRS Deferred Demo', 'liability');
    const revenue = await ensureCoa(company.id, 'LRS-REV', 'LRS Revenue Demo', 'revenue');

    if (DRY) {
      console.log('DRY RUN — would create manual schedule');
      process.exit(0);
    }

    const existing = await LeaseRevenueSchedule.findOne({
      where: { companyId: company.id, isTestData: true, notes: { [Op.like]: '%120k%' } },
    });
    if (existing) {
      console.log(`Demo schedule already exists: ${existing.scheduleNumber}`);
      process.exit(0);
    }

    const record = await revenueService.createSchedule(req, {
      leaseId: anyLease.id,
      totalContractAmount: 120000,
      serviceStartDate: '2026-01-15',
      serviceEndDate: '2027-01-14',
      revenueAccountId: revenue.id,
      deferredRevenueAccountId: deferred.id,
      revenueModel: 'DEFERRED',
      notes: 'Demo lease revenue — 120k / 365 days',
      isTestData: true,
    });
    await revenueService.generateSchedule(req, record.id);
    console.log(`Created ${record.scheduleNumber}`);
    process.exit(0);
  }

  if (DRY) {
    console.log(`DRY RUN — would generate from lease ${lease.leaseNumber}`);
    process.exit(0);
  }

  const existing = await LeaseRevenueSchedule.findOne({
    where: { companyId: company.id, leaseId: lease.id, isTestData: true },
  });
  if (existing) {
    console.log(`Demo schedule already exists for lease: ${existing.scheduleNumber}`);
    process.exit(0);
  }

  const record = await revenueService.generateFromLease(req, lease.id, {
    isTestData: true,
    notes: 'Demo lease revenue — generated from lease',
  });
  console.log(`Created ${record.scheduleNumber} from lease ${lease.leaseNumber}`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
