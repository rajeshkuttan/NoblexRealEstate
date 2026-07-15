'use strict';

const {
  PrepaidExpenseScheduleLine,
  sequelize,
} = require('../../models');
const { companyWhere, withCompanyId } = require('../../utils/companyScope');
const calc = require('./prepaidCalculation.service');
const { hasLockedScheduleLines } = require('./prepaidValidation.service');

const LOCKED_STATUSES = new Set(['POSTED', 'DRAFT_JV_CREATED', 'REVERSED']);

async function loadScheduleLines(prepaidExpenseId, req, transaction) {
  return PrepaidExpenseScheduleLine.findAll({
    where: { prepaidExpenseId, ...companyWhere(req) },
    order: [['lineNumber', 'ASC']],
    transaction,
  });
}

function canRegenerateSchedule(expense, existingLines = []) {
  const editableStatuses = new Set(['DRAFT', 'SCHEDULE_GENERATED']);
  if (!editableStatuses.has(expense.status)) return false;
  return !hasLockedScheduleLines(existingLines);
}

async function persistScheduleLines(req, prepaidExpense, scheduleRows, transaction) {
  const existing = await loadScheduleLines(prepaidExpense.id, req, transaction);
  if (hasLockedScheduleLines(existing)) {
    const err = new Error('Cannot regenerate schedule: locked or posted lines exist');
    err.statusCode = 400;
    throw err;
  }

  await PrepaidExpenseScheduleLine.destroy({
    where: { prepaidExpenseId: prepaidExpense.id, ...companyWhere(req) },
    transaction,
  });

  const totalAmount = parseFloat(prepaidExpense.totalAmount);
  let cumulative = 0;
  const created = [];

  for (const row of scheduleRows) {
    cumulative += parseFloat(row.scheduledAmount);
    const line = await PrepaidExpenseScheduleLine.create(
      withCompanyId(req, {
        prepaidExpenseId: prepaidExpense.id,
        lineNumber: row.lineNumber,
        fiscalYear: parseInt(row.recognitionMonth.split('-')[0], 10),
        recognitionMonth: row.recognitionMonth,
        periodStartDate: row.periodStart,
        periodEndDate: row.periodEnd,
        serviceDays: row.serviceDays,
        dailyRate: row.dailyRate,
        scheduledAmount: row.scheduledAmount,
        baseScheduledAmount: row.scheduledAmount,
        cumulativeRecognizedAmount: row.cumulativeRecognizedAmount || cumulative.toFixed(2),
        remainingBalanceAfterLine:
          row.remainingBalanceAfterLine || (totalAmount - cumulative).toFixed(2),
        recognitionDate: row.recognitionDate || row.periodEnd,
        dueDate: row.dueDate || row.periodEnd,
        postingStatus: 'SCHEDULED',
        isFinalAdjustment: !!row.isFinalAdjustment,
        isLocked: false,
      }),
      { transaction }
    );
    created.push(line);
  }

  return created;
}

async function generateAndPersistSchedule(req, prepaidExpense, transaction) {
  const schedule = calc.calculateMonthlySchedule(
    prepaidExpense.totalAmount,
    prepaidExpense.serviceStartDate,
    prepaidExpense.serviceEndDate,
    2
  );

  const totalDays = calc.calculateInclusiveDays(
    prepaidExpense.serviceStartDate,
    prepaidExpense.serviceEndDate
  );
  const dailyRate = calc.calculateDailyRate(prepaidExpense.totalAmount, totalDays);

  await prepaidExpense.update(
    {
      totalServiceDays: totalDays,
      dailyRate,
      scheduleStatus: 'GENERATED',
      status: prepaidExpense.status === 'DRAFT' ? 'SCHEDULE_GENERATED' : prepaidExpense.status,
      remainingAmount: prepaidExpense.totalAmount,
      recognizedAmount: 0,
    },
    { transaction }
  );

  const lines = await persistScheduleLines(req, prepaidExpense, schedule, transaction);
  return { schedule, lines };
}

async function regenerateSchedule(req, prepaidExpense, transaction) {
  const existing = await loadScheduleLines(prepaidExpense.id, req, transaction);
  if (!canRegenerateSchedule(prepaidExpense, existing)) {
    const err = new Error('Schedule cannot be regenerated in current state');
    err.statusCode = 400;
    throw err;
  }
  return generateAndPersistSchedule(req, prepaidExpense, transaction);
}

async function regenerateFutureLinesOnly(req, prepaidExpense, fromDate, newEndDate, newAmount, transaction) {
  const existing = await loadScheduleLines(prepaidExpense.id, req, transaction);
  const locked = existing.filter((l) => LOCKED_STATUSES.has(l.postingStatus) || l.isLocked);
  const unposted = existing.filter((l) => !LOCKED_STATUSES.has(l.postingStatus) && !l.isLocked);

  if (unposted.length) {
    await PrepaidExpenseScheduleLine.destroy({
      where: { id: unposted.map((l) => l.id), ...companyWhere(req) },
      transaction,
    });
  }

  const recognized = locked.reduce((s, l) => s + parseFloat(l.scheduledAmount), 0);
  const remainingAmt = parseFloat(newAmount) - recognized;
  if (remainingAmt <= 0) return locked;

  const tail = calc.calculateMonthlySchedule(remainingAmt, fromDate, newEndDate, 2);
  let lineNo = locked.length + 1;
  const created = [];
  for (const row of tail) {
    const line = await PrepaidExpenseScheduleLine.create(
      withCompanyId(req, {
        prepaidExpenseId: prepaidExpense.id,
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
    created.push(line);
  }
  return [...locked, ...created];
}

module.exports = {
  loadScheduleLines,
  canRegenerateSchedule,
  persistScheduleLines,
  generateAndPersistSchedule,
  regenerateSchedule,
  regenerateFutureLinesOnly,
};
