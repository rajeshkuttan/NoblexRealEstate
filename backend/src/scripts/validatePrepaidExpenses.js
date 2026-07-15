'use strict';

/**
 * Validate prepaid expense demo seed — demo/test companies only.
 */
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const {
  CompanySetting,
  PrepaidExpense,
  PrepaidExpenseScheduleLine,
} = require('../models');
const calc = require('../services/prepaidExpenses/prepaidCalculation.service');

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

  const records = await PrepaidExpense.findAll({
    where: { companyId: company.id, isTestData: true },
    include: [{ model: PrepaidExpenseScheduleLine, as: 'scheduleLines' }],
  });

  let errors = 0;
  for (const pe of records) {
    const lines = pe.scheduleLines || [];
    const sum = lines.reduce((s, l) => s + parseFloat(l.scheduledAmount), 0);
    const expected = parseFloat(pe.totalAmount);
    if (Math.abs(sum - expected) > 0.01) {
      console.error(`FAIL ${pe.prepaidNumber}: schedule sum ${sum} != ${expected}`);
      errors += 1;
    }
    const posted = lines.filter((l) => l.postingStatus === 'POSTED');
    if (posted.length) {
      console.warn(`WARN ${pe.prepaidNumber}: has posted lines in demo data (${posted.length})`);
    }
    if (pe.description.includes('120k')) {
      const v = calc.validateScheduleTotals(
        lines.map((l) => ({
          scheduledAmount: l.scheduledAmount,
          serviceDays: l.serviceDays,
        })),
        pe.totalAmount,
        2
      );
      if (!v.valid) {
        console.error(`FAIL 120k fixture validation for ${pe.prepaidNumber}`);
        errors += 1;
      }
      if (lines.length !== 13) {
        console.error(`FAIL 120k fixture: expected 13 lines, got ${lines.length}`);
        errors += 1;
      }
    }
    console.log(`OK ${pe.prepaidNumber} — ${lines.length} lines, status=${pe.status}`);
  }

  if (errors) {
    console.error(`Validation finished with ${errors} error(s)`);
    process.exit(1);
  }
  console.log(`Validated ${records.length} demo prepaid expense(s)`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
