'use strict';

const { Op } = require('sequelize');
const { PrepaidExpense, PrepaidExpenseScheduleLine } = require('../../models');
const { companyWhere } = require('../../utils/companyScope');

async function getDashboardKpis(req) {
  const activeStatuses = ['ACTIVE', 'PARTIALLY_RECOGNIZED', 'SUSPENDED'];
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const monthKey = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;

  const activeCount = await PrepaidExpense.count({
    where: { ...companyWhere(req), status: { [Op.in]: activeStatuses } },
  });

  const remainingRows = await PrepaidExpense.findAll({
    where: { ...companyWhere(req), status: { [Op.in]: activeStatuses } },
    attributes: ['remainingAmount'],
  });
  const remainingTotal = remainingRows.reduce((s, r) => s + parseFloat(r.remainingAmount || 0), 0);

  const dueThisMonth = await PrepaidExpenseScheduleLine.count({
    where: {
      ...companyWhere(req),
      recognitionMonth: monthKey,
      postingStatus: { [Op.in]: ['SCHEDULED', 'DUE', 'DRAFT_JV_CREATED'] },
    },
  });

  const exceptions = await PrepaidExpenseScheduleLine.count({
    where: {
      ...companyWhere(req),
      postingStatus: { [Op.in]: ['FAILED', 'BLOCKED'] },
    },
  });

  const postingQueue = await PrepaidExpenseScheduleLine.count({
    where: {
      ...companyWhere(req),
      postingStatus: { [Op.in]: ['DUE', 'DRAFT_JV_CREATED', 'POSTING_READY'] },
    },
  });

  return {
    activeCount,
    remainingTotal: remainingTotal.toFixed(2),
    dueThisMonth,
    exceptions,
    postingQueue,
  };
}

module.exports = {
  getDashboardKpis,
};
