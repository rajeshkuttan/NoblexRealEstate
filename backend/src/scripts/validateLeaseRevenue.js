'use strict';

/**
 * Validate lease revenue demo seed — demo/test companies only.
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  CompanySetting,
  LeaseRevenueSchedule,
  LeaseRevenueScheduleLine,
} = require('../models');
const calc = require('../services/leaseRevenue/leaseRevenueCalculation.service');

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

async function run() {
  await sequelize.authenticate();
  const company = await findDemoCompany();
  if (!company) {
    console.error('No demo/test company found');
    process.exit(1);
  }

  const records = await LeaseRevenueSchedule.findAll({
    where: { companyId: company.id, isTestData: true },
    include: [{ model: LeaseRevenueScheduleLine, as: 'scheduleLines' }],
  });

  let errors = 0;
  for (const sched of records) {
    const lines = sched.scheduleLines || [];
    const sum = lines.reduce((s, l) => s + parseFloat(l.scheduledAmount), 0);
    const expected = parseFloat(sched.totalContractAmount);
    if (Math.abs(sum - expected) > 0.01) {
      console.error(`FAIL ${sched.scheduleNumber}: schedule sum ${sum} != ${expected}`);
      errors += 1;
    }
    const posted = lines.filter((l) => l.postingStatus === 'POSTED');
    if (posted.length) {
      console.warn(`WARN ${sched.scheduleNumber}: has posted lines in demo data (${posted.length})`);
    }
    if ((sched.notes || '').includes('120k') || expected === 120000) {
      const v = calc.validateScheduleTotals(
        lines.map((l) => ({
          scheduledAmount: l.scheduledAmount,
          serviceDays: l.recognitionDays,
        })),
        sched.totalContractAmount,
        2
      );
      if (!v.valid) {
        console.error(`FAIL 120k fixture validation for ${sched.scheduleNumber}`);
        errors += 1;
      }
      if (lines.length !== 13) {
        console.error(`FAIL 120k fixture: expected 13 lines, got ${lines.length}`);
        errors += 1;
      }
    }
    console.log(`OK ${sched.scheduleNumber} — ${lines.length} lines, status=${sched.status}`);
  }

  if (errors) {
    console.error(`Validation finished with ${errors} error(s)`);
    process.exit(1);
  }
  console.log(`Validated ${records.length} demo lease revenue schedule(s)`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
