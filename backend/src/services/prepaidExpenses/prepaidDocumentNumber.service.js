'use strict';

const companyDocumentNumber = require('../companyDocumentNumber.service');
const { PrepaidExpense, PrepaidExpensePostingBatch } = require('../../models');
const { companyWhere } = require('../../utils/companyScope');

async function generatePrepaidNumber(req, transaction) {
  let num = await companyDocumentNumber.generateDocumentNumber({
    companyId: req.companyId,
    documentType: 'prepaid_expense',
    transaction,
  });
  if (!num) {
    const count = await PrepaidExpense.count({ where: { ...companyWhere(req) }, transaction });
    num = `PPD-${String(count + 1).padStart(6, '0')}`;
  }
  return num;
}

async function generatePostingBatchNumber(req, transaction) {
  let num = await companyDocumentNumber.generateDocumentNumber({
    companyId: req.companyId,
    documentType: 'prepaid_posting_batch',
    transaction,
  });
  if (!num) {
    const count = await PrepaidExpensePostingBatch.count({
      where: { ...companyWhere(req) },
      transaction,
    });
    num = `PPB-${String(count + 1).padStart(6, '0')}`;
  }
  return num;
}

module.exports = {
  generatePrepaidNumber,
  generatePostingBatchNumber,
};
