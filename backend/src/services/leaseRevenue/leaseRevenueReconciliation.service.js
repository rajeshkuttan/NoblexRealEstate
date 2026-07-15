'use strict';

const Decimal = require('decimal.js');
const { LeaseRevenueReconciliation, ChartOfAccount } = require('../../models');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../../utils/companyScope');
const revenueService = require('./leaseRevenue.service');

async function computeReconciliation(req, scheduleId, asOfDate) {
  const schedule = await revenueService.getSchedule(req, scheduleId);
  const reconDate = asOfDate || new Date().toISOString().slice(0, 10);

  const originalAmount = parseFloat(schedule.totalContractAmount);
  const recognizedAmount = parseFloat(schedule.recognizedAmount || 0);
  const remainingSubledger = parseFloat(schedule.deferredBalance ?? schedule.remainingAmount ?? 0);

  const deferredAccount = schedule.deferredRevenueAccountId
    ? await ChartOfAccount.findOne({
        where: { id: schedule.deferredRevenueAccountId, ...companyWhere(req) },
      })
    : null;
  const deferredGlBalance = deferredAccount ? parseFloat(deferredAccount.balance || 0) : 0;
  const difference = new Decimal(remainingSubledger).minus(deferredGlBalance);

  const settings = await revenueService.getSettings(req);
  const tolerance = settings.settingsJson?.tolerance?.reconciliation ?? 1.0;
  let status = 'EXCEPTION';
  if (difference.abs().lte(tolerance)) {
    status = difference.abs().lte(0.01) ? 'MATCHED' : 'MATCHED_WITHIN_TOLERANCE';
  }

  return {
    scheduleId,
    reconciliationDate: reconDate,
    originalAmount,
    recognizedAmount,
    remainingSubledgerBalance: remainingSubledger,
    deferredGlBalance,
    differenceAmount: difference.toFixed(2),
    status,
    exceptionReason: status === 'EXCEPTION' ? 'Subledger balance differs from deferred revenue GL account' : null,
  };
}

async function createReconciliation(req, scheduleId, asOfDate) {
  const payload = await computeReconciliation(req, scheduleId, asOfDate);
  return LeaseRevenueReconciliation.create(withCompanyId(req, payload));
}

async function resolveReconciliation(req, reconciliationId, { notes } = {}) {
  const recon = await assertRecordInCompany(LeaseRevenueReconciliation, reconciliationId, req);
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
