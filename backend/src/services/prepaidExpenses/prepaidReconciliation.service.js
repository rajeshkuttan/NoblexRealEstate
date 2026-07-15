'use strict';

const Decimal = require('decimal.js');
const { PrepaidExpense, PrepaidExpenseReconciliation, ChartOfAccount, sequelize } = require('../../models');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../../utils/companyScope');
const expenseService = require('./prepaidExpense.service');

async function computeReconciliation(req, prepaidExpenseId, asOfDate) {
  const expense = await expenseService.getPrepaidExpense(req, prepaidExpenseId);
  const reconDate = asOfDate || new Date().toISOString().slice(0, 10);

  const originalAmount = parseFloat(expense.totalAmount);
  const recognizedAmount = parseFloat(expense.recognizedAmount || 0);
  const remainingSubledger = parseFloat(expense.remainingAmount || 0);

  const assetAccount = await ChartOfAccount.findOne({
    where: { id: expense.prepaidAssetAccountId, ...companyWhere(req) },
  });
  const prepaidGlBalance = assetAccount ? parseFloat(assetAccount.balance || 0) : 0;
  const difference = new Decimal(remainingSubledger).minus(prepaidGlBalance);

  const settings = await expenseService.getSettings(req);
  const tolerance = settings.settingsJson?.tolerance?.reconciliation ?? 1.0;
  let status = 'EXCEPTION';
  if (difference.abs().lte(tolerance)) {
    status = difference.abs().lte(0.01) ? 'MATCHED' : 'MATCHED_WITHIN_TOLERANCE';
  }

  return {
    prepaidExpenseId,
    reconciliationDate: reconDate,
    originalAmount,
    recognizedAmount,
    remainingSubledgerBalance: remainingSubledger,
    prepaidGlBalance,
    differenceAmount: difference.toFixed(2),
    status,
    exceptionReason: status === 'EXCEPTION' ? 'Subledger balance differs from prepaid GL account' : null,
  };
}

async function createReconciliation(req, prepaidExpenseId, asOfDate) {
  const payload = await computeReconciliation(req, prepaidExpenseId, asOfDate);
  return PrepaidExpenseReconciliation.create(withCompanyId(req, payload));
}

async function resolveReconciliation(req, reconciliationId, { notes } = {}) {
  const recon = await assertRecordInCompany(PrepaidExpenseReconciliation, reconciliationId, req);
  await recon.update({
    status: 'RESOLVED',
    resolvedBy: req.user?.id,
    resolvedAt: new Date(),
    exceptionReason: notes || recon.exceptionReason,
  });
  return recon;
}

module.exports = {
  computeReconciliation,
  createReconciliation,
  resolveReconciliation,
};
