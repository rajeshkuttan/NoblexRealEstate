'use strict';

const { Op } = require('sequelize');
const {
  PrepaidExpense,
  PrepaidExpenseAmendment,
  PrepaidExpenseScheduleLine,
  sequelize,
} = require('../../models');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../../utils/companyScope');
const scheduleService = require('./prepaidSchedule.service');
const calc = require('./prepaidCalculation.service');

async function createAmendment(req, prepaidExpenseId, body) {
  return sequelize.transaction(async (transaction) => {
    const expense = await assertRecordInCompany(PrepaidExpense, prepaidExpenseId, req, { transaction });
    if (['DRAFT', 'CANCELLED', 'TERMINATED'].includes(expense.status)) {
      const err = new Error('Amendments not allowed for this status');
      err.statusCode = 400;
      throw err;
    }

    const count = await PrepaidExpenseAmendment.count({
      where: { prepaidExpenseId, ...companyWhere(req) },
      transaction,
    });

    const amendment = await PrepaidExpenseAmendment.create(
      withCompanyId(req, {
        prepaidExpenseId,
        amendmentNumber: `AMD-${expense.prepaidNumber}-${count + 1}`,
        amendmentType: body.amendmentType ?? body.amendment_type ?? 'OTHER',
        requestedChangesJson: body.requestedChanges ?? body.requested_changes_json ?? body,
        reason: body.reason,
        effectiveDate: body.effectiveDate ?? body.effective_date,
        status: 'SUBMITTED',
        submittedBy: req.user?.id || 1,
      }),
      { transaction }
    );

    return amendment;
  });
}

async function applyAmendmentChanges(req, expense, amendment, transaction) {
  const changes = amendment.requestedChangesJson || {};
  const type = amendment.amendmentType;

  if (type === 'EARLY_TERMINATION' || changes.serviceEndDate || changes.service_end_date) {
    const newEnd = changes.serviceEndDate ?? changes.service_end_date ?? amendment.effectiveDate;
    const posted = await PrepaidExpenseScheduleLine.findAll({
      where: {
        prepaidExpenseId: expense.id,
        ...companyWhere(req),
        postingStatus: { [Op.in]: ['POSTED', 'DRAFT_JV_CREATED', 'REVERSED'] },
      },
      transaction,
    });

    await PrepaidExpenseScheduleLine.destroy({
      where: {
        prepaidExpenseId: expense.id,
        ...companyWhere(req),
        postingStatus: { [Op.notIn]: ['POSTED', 'DRAFT_JV_CREATED', 'REVERSED'] },
        periodStartDate: { [Op.gt]: newEnd },
      },
      transaction,
    });

    const recognized = posted.reduce((s, l) => s + parseFloat(l.scheduledAmount), 0);
    const remaining = parseFloat(expense.totalAmount) - recognized;
    const fromDate = amendment.effectiveDate;

    if (remaining > 0 && calc.parseDateOnly(fromDate) <= calc.parseDateOnly(newEnd)) {
      const tail = calc.calculateMonthlySchedule(remaining, fromDate, newEnd, 2);
      let lineNo = posted.length + 1;
      for (const row of tail) {
        await PrepaidExpenseScheduleLine.create(
          withCompanyId(req, {
            prepaidExpenseId: expense.id,
            lineNumber: lineNo++,
            fiscalYear: parseInt(row.recognitionMonth.split('-')[0], 10),
            recognitionMonth: row.recognitionMonth,
            periodStartDate: row.periodStart,
            periodEndDate: row.periodEnd,
            serviceDays: row.serviceDays,
            dailyRate: row.dailyRate,
            scheduledAmount: row.scheduledAmount,
            baseScheduledAmount: row.scheduledAmount,
            recognitionDate: row.periodEnd,
            dueDate: row.periodEnd,
            postingStatus: 'SCHEDULED',
            isFinalAdjustment: !!row.isFinalAdjustment,
          }),
          { transaction }
        );
      }
    }

    await expense.update({
      serviceEndDate: newEnd,
      terminatedOn: newEnd,
      terminationReason: amendment.reason,
      status: 'TERMINATED',
      totalServiceDays: calc.calculateInclusiveDays(expense.serviceStartDate, newEnd),
    }, { transaction });
    return expense;
  }

  if (type === 'AMOUNT_CHANGE' || changes.totalAmount != null) {
    const newAmount = changes.totalAmount ?? changes.total_amount;
    await expense.update({ totalAmount: newAmount, remainingAmount: newAmount }, { transaction });
    await scheduleService.regenerateFutureLinesOnly(
      req,
      expense,
      amendment.effectiveDate,
      expense.serviceEndDate,
      newAmount,
      transaction
    );
    return expense;
  }

  if (type === 'END_DATE_CHANGE' && (changes.serviceEndDate || changes.service_end_date)) {
    const newEnd = changes.serviceEndDate ?? changes.service_end_date;
    await expense.update({
      serviceEndDate: newEnd,
      totalServiceDays: calc.calculateInclusiveDays(expense.serviceStartDate, newEnd),
    }, { transaction });
    await scheduleService.regenerateFutureLinesOnly(
      req,
      expense,
      amendment.effectiveDate,
      newEnd,
      expense.totalAmount,
      transaction
    );
    return expense;
  }

  if (type === 'ACCOUNT_CHANGE') {
    await expense.update({
      prepaidAssetAccountId: changes.prepaidAssetAccountId ?? expense.prepaidAssetAccountId,
      expenseAccountId: changes.expenseAccountId ?? expense.expenseAccountId,
      creditAccountId: changes.creditAccountId ?? expense.creditAccountId,
    }, { transaction });
  }

  return expense;
}

async function approveAmendment(req, amendmentId) {
  return sequelize.transaction(async (transaction) => {
    const amendment = await assertRecordInCompany(PrepaidExpenseAmendment, amendmentId, req, { transaction });
    if (amendment.status !== 'SUBMITTED') {
      const err = new Error('Amendment is not pending approval');
      err.statusCode = 400;
      throw err;
    }
    const expense = await assertRecordInCompany(PrepaidExpense, amendment.prepaidExpenseId, req, { transaction });
    await applyAmendmentChanges(req, expense, amendment, transaction);
    await amendment.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    }, { transaction });
    return amendment.reload({ transaction });
  });
}

async function rejectAmendment(req, amendmentId, { reason } = {}) {
  const amendment = await assertRecordInCompany(PrepaidExpenseAmendment, amendmentId, req);
  if (amendment.status !== 'SUBMITTED') {
    const err = new Error('Amendment is not pending approval');
    err.statusCode = 400;
    throw err;
  }
  await amendment.update({ status: 'REJECTED', reason: reason || amendment.reason });
  return amendment;
}

module.exports = {
  createAmendment,
  approveAmendment,
  rejectAmendment,
};
