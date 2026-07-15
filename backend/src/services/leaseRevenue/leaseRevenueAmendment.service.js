'use strict';

const { Op } = require('sequelize');
const {
  LeaseRevenueSchedule,
  LeaseRevenueAdjustment,
  LeaseRevenueScheduleLine,
  sequelize,
} = require('../../models');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../../utils/companyScope');
const scheduleService = require('./leaseRevenueSchedule.service');
const calc = require('./leaseRevenueCalculation.service');

async function createAmendment(req, scheduleId, body) {
  return sequelize.transaction(async (transaction) => {
    const schedule = await assertRecordInCompany(LeaseRevenueSchedule, scheduleId, req, { transaction });
    if (['DRAFT', 'CANCELLED', 'TERMINATED'].includes(schedule.status)) {
      const err = new Error('Amendments not allowed for this status');
      err.statusCode = 400;
      throw err;
    }

    const count = await LeaseRevenueAdjustment.count({
      where: { scheduleId, ...companyWhere(req) },
      transaction,
    });

    const adjustment = await LeaseRevenueAdjustment.create(
      withCompanyId(req, {
        scheduleId,
        adjustmentNumber: `ADJ-${schedule.scheduleNumber}-${count + 1}`,
        adjustmentType: body.adjustmentType ?? body.adjustment_type ?? body.amendmentType ?? 'OTHER',
        requestedChangesJson: body.requestedChanges ?? body.requested_changes_json ?? body,
        reason: body.reason,
        effectiveDate: body.effectiveDate ?? body.effective_date,
        amount: body.amount ?? null,
        status: 'SUBMITTED',
        submittedBy: req.user?.id || 1,
      }),
      { transaction }
    );

    return adjustment;
  });
}

async function applyAmendmentChanges(req, schedule, adjustment, transaction) {
  const changes = adjustment.requestedChangesJson || {};
  const type = adjustment.adjustmentType;

  if (type === 'EARLY_TERMINATION' || changes.serviceEndDate || changes.service_end_date) {
    const newEnd = changes.serviceEndDate ?? changes.service_end_date ?? adjustment.effectiveDate;
    const posted = await LeaseRevenueScheduleLine.findAll({
      where: {
        scheduleId: schedule.id,
        ...companyWhere(req),
        postingStatus: { [Op.in]: ['POSTED', 'DRAFT_JV_CREATED', 'REVERSED'] },
      },
      transaction,
    });

    await LeaseRevenueScheduleLine.destroy({
      where: {
        scheduleId: schedule.id,
        ...companyWhere(req),
        postingStatus: { [Op.notIn]: ['POSTED', 'DRAFT_JV_CREATED', 'REVERSED'] },
        periodStartDate: { [Op.gt]: newEnd },
      },
      transaction,
    });

    const recognized = posted.reduce((s, l) => s + parseFloat(l.scheduledAmount), 0);
    const remaining = parseFloat(schedule.totalContractAmount) - recognized;
    const fromDate = adjustment.effectiveDate;

    if (remaining > 0 && calc.parseDateOnly(fromDate) <= calc.parseDateOnly(newEnd)) {
      const tail = calc.calculateMonthlySchedule(remaining, fromDate, newEnd, 2);
      let lineNo = posted.length + 1;
      for (const row of tail) {
        await LeaseRevenueScheduleLine.create(
          withCompanyId(req, {
            scheduleId: schedule.id,
            lineNumber: lineNo++,
            fiscalYear: parseInt(row.recognitionMonth.split('-')[0], 10),
            recognitionMonth: row.recognitionMonth,
            periodStartDate: row.periodStart,
            periodEndDate: row.periodEnd,
            recognitionDays: row.serviceDays,
            dailyRate: row.dailyRate,
            scheduledAmount: row.scheduledAmount,
            baseScheduledAmount: row.scheduledAmount,
            recognitionDate: row.periodEnd,
            dueDate: row.periodEnd,
            postingStatus: 'SCHEDULED',
            scheduleVersion: schedule.versionNumber || 1,
            isFinalAdjustment: !!row.isFinalAdjustment,
          }),
          { transaction }
        );
      }
    }

    await schedule.update({
      serviceEndDate: newEnd,
      terminatedOn: newEnd,
      terminationReason: adjustment.reason,
      status: 'TERMINATED',
      totalServiceDays: calc.calculateInclusiveDays(schedule.serviceStartDate, newEnd),
    }, { transaction });
    return schedule;
  }

  if (type === 'AMOUNT_CHANGE' || changes.totalContractAmount != null || changes.totalAmount != null) {
    const newAmount = changes.totalContractAmount ?? changes.total_contract_amount ?? changes.totalAmount;
    await schedule.update({
      totalContractAmount: newAmount,
      remainingAmount: newAmount,
      deferredBalance: newAmount,
    }, { transaction });
    await scheduleService.regenerateFutureLinesOnly(
      req,
      schedule,
      adjustment.effectiveDate,
      schedule.serviceEndDate,
      newAmount,
      transaction
    );
    return schedule;
  }

  if (type === 'END_DATE_CHANGE' && (changes.serviceEndDate || changes.service_end_date)) {
    const newEnd = changes.serviceEndDate ?? changes.service_end_date;
    await schedule.update({
      serviceEndDate: newEnd,
      totalServiceDays: calc.calculateInclusiveDays(schedule.serviceStartDate, newEnd),
    }, { transaction });
    await scheduleService.regenerateFutureLinesOnly(
      req,
      schedule,
      adjustment.effectiveDate,
      newEnd,
      schedule.totalContractAmount,
      transaction
    );
    return schedule;
  }

  if (type === 'ACCOUNT_CHANGE') {
    await schedule.update({
      revenueAccountId: changes.revenueAccountId ?? schedule.revenueAccountId,
      deferredRevenueAccountId: changes.deferredRevenueAccountId ?? schedule.deferredRevenueAccountId,
      accruedRevenueAccountId: changes.accruedRevenueAccountId ?? schedule.accruedRevenueAccountId,
      receivableAccountId: changes.receivableAccountId ?? schedule.receivableAccountId,
    }, { transaction });
  }

  return schedule;
}

async function approveAmendment(req, adjustmentId) {
  return sequelize.transaction(async (transaction) => {
    const adjustment = await assertRecordInCompany(LeaseRevenueAdjustment, adjustmentId, req, { transaction });
    if (adjustment.status !== 'SUBMITTED') {
      const err = new Error('Adjustment is not pending approval');
      err.statusCode = 400;
      throw err;
    }
    const schedule = await assertRecordInCompany(LeaseRevenueSchedule, adjustment.scheduleId, req, { transaction });
    await scheduleService.saveVersionSnapshot(req, schedule, `Amendment ${adjustment.adjustmentNumber}`, transaction);
    await applyAmendmentChanges(req, schedule, adjustment, transaction);
    await adjustment.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    }, { transaction });
    return adjustment.reload({ transaction });
  });
}

async function rejectAmendment(req, adjustmentId, { reason } = {}) {
  const adjustment = await assertRecordInCompany(LeaseRevenueAdjustment, adjustmentId, req);
  if (adjustment.status !== 'SUBMITTED') {
    const err = new Error('Adjustment is not pending approval');
    err.statusCode = 400;
    throw err;
  }
  await adjustment.update({ status: 'REJECTED', reason: reason || adjustment.reason });
  return adjustment;
}

module.exports = {
  createAmendment,
  approveAmendment,
  rejectAmendment,
  applyAmendmentChanges,
};
