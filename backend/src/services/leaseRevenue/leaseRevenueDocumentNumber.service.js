'use strict';

const companyDocumentNumber = require('../companyDocumentNumber.service');
const { LeaseRevenueSchedule, LeaseRevenuePostingBatch } = require('../../models');
const { companyWhere } = require('../../utils/companyScope');

async function generateScheduleNumber(req, transaction) {
  let num = await companyDocumentNumber.generateDocumentNumber({
    companyId: req.companyId,
    documentType: 'lease_revenue_schedule',
    transaction,
  });
  if (!num) {
    const count = await LeaseRevenueSchedule.count({ where: { ...companyWhere(req) }, transaction });
    num = `LRS-${String(count + 1).padStart(6, '0')}`;
  }
  return num;
}

async function generatePostingBatchNumber(req, transaction) {
  let num = await companyDocumentNumber.generateDocumentNumber({
    companyId: req.companyId,
    documentType: 'lease_revenue_batch',
    transaction,
  });
  if (!num) {
    const count = await LeaseRevenuePostingBatch.count({
      where: { ...companyWhere(req) },
      transaction,
    });
    num = `LRB-${String(count + 1).padStart(6, '0')}`;
  }
  return num;
}

module.exports = {
  generateScheduleNumber,
  generatePostingBatchNumber,
};
