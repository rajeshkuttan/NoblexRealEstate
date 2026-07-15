'use strict';

const { Op } = require('sequelize');
const { LeaseRevenueSchedule, LeaseRevenueScheduleLine } = require('../../models');
const { companyWhere } = require('../../utils/companyScope');

async function getDashboardKpis(req) {
  const activeStatuses = ['ACTIVE', 'PARTIALLY_RECOGNIZED', 'SUSPENDED'];
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const monthKey = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;

  const activeCount = await LeaseRevenueSchedule.count({
    where: { ...companyWhere(req), status: { [Op.in]: activeStatuses } },
  });

  const remainingRows = await LeaseRevenueSchedule.findAll({
    where: { ...companyWhere(req), status: { [Op.in]: activeStatuses } },
    attributes: ['remainingAmount', 'deferredBalance'],
  });
  const remainingTotal = remainingRows.reduce(
    (s, r) => s + parseFloat(r.deferredBalance || r.remainingAmount || 0),
    0
  );

  const dueThisMonth = await LeaseRevenueScheduleLine.count({
    where: {
      ...companyWhere(req),
      recognitionMonth: monthKey,
      postingStatus: { [Op.in]: ['SCHEDULED', 'DUE', 'DRAFT_JV_CREATED'] },
    },
  });

  const exceptions = await LeaseRevenueScheduleLine.count({
    where: {
      ...companyWhere(req),
      postingStatus: { [Op.in]: ['FAILED', 'BLOCKED'] },
    },
  });

  const postingQueue = await LeaseRevenueScheduleLine.count({
    where: {
      ...companyWhere(req),
      postingStatus: { [Op.in]: ['DUE', 'DRAFT_JV_CREATED', 'POSTING_READY'] },
    },
  });

  const recognizedRows = await LeaseRevenueSchedule.findAll({
    where: { ...companyWhere(req), status: { [Op.in]: [...activeStatuses, 'FULLY_RECOGNIZED'] } },
    attributes: ['recognizedAmount'],
  });
  const recognizedTotal = recognizedRows.reduce((s, r) => s + parseFloat(r.recognizedAmount || 0), 0);

  return {
    activeCount,
    remainingTotal: remainingTotal.toFixed(2),
    recognizedTotal: recognizedTotal.toFixed(2),
    dueThisMonth,
    exceptions,
    postingQueue,
  };
}

module.exports = {
  getDashboardKpis,
};
