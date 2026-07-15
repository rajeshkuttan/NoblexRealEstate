'use strict';

const {
  LeaseRevenueScheduleLine,
  LeaseRevenueVersion,
} = require('../../models');
const { companyWhere, withCompanyId } = require('../../utils/companyScope');
const calc = require('./leaseRevenueCalculation.service');
const { hasLockedScheduleLines } = require('./leaseRevenueValidation.service');

const LOCKED_STATUSES = new Set(['POSTED', 'DRAFT_JV_CREATED', 'REVERSED']);

async function loadScheduleLines(scheduleId, req, transaction) {
  return LeaseRevenueScheduleLine.findAll({
    where: { scheduleId, ...companyWhere(req) },
    order: [['lineNumber', 'ASC']],
    transaction,
  });
}

function canRegenerateSchedule(schedule, existingLines = []) {
  const editableStatuses = new Set(['DRAFT', 'SCHEDULE_GENERATED']);
  if (!editableStatuses.has(schedule.status)) return false;
  return !hasLockedScheduleLines(existingLines);
}

async function saveVersionSnapshot(req, schedule, reason, transaction) {
  const lines = await loadScheduleLines(schedule.id, req, transaction);
  const nextVersion = (schedule.versionNumber || 1) + 1;
  await LeaseRevenueVersion.create(
    withCompanyId(req, {
      scheduleId: schedule.id,
      versionNumber: schedule.versionNumber || 1,
      reason: reason || 'Schedule regeneration',
      snapshotJson: {
        schedule: schedule.toJSON ? schedule.toJSON() : schedule,
        lines: lines.map((l) => (l.toJSON ? l.toJSON() : l)),
      },
      createdBy: req.user?.id || 1,
    }),
    { transaction }
  );
  await schedule.update({ versionNumber: nextVersion }, { transaction });
  return nextVersion;
}

async function persistScheduleLines(req, schedule, scheduleRows, transaction, { versionNumber } = {}) {
  const existing = await loadScheduleLines(schedule.id, req, transaction);
  if (hasLockedScheduleLines(existing)) {
    const err = new Error('Cannot regenerate schedule: locked or posted lines exist');
    err.statusCode = 400;
    throw err;
  }

  await LeaseRevenueScheduleLine.destroy({
    where: { scheduleId: schedule.id, ...companyWhere(req) },
    transaction,
  });

  const totalAmount = parseFloat(schedule.totalContractAmount);
  let cumulative = 0;
  const created = [];
  const ver = versionNumber || schedule.versionNumber || 1;

  for (const row of scheduleRows) {
    cumulative += parseFloat(row.scheduledAmount);
    const line = await LeaseRevenueScheduleLine.create(
      withCompanyId(req, {
        scheduleId: schedule.id,
        componentId: row.componentId || null,
        lineNumber: row.lineNumber,
        fiscalYear: parseInt(row.recognitionMonth.split('-')[0], 10),
        recognitionMonth: row.recognitionMonth,
        periodStartDate: row.periodStart,
        periodEndDate: row.periodEnd,
        recognitionDays: row.serviceDays,
        dailyRate: row.dailyRate,
        scheduledAmount: row.scheduledAmount,
        baseScheduledAmount: row.scheduledAmount,
        cumulativeAmount: row.cumulativeRecognizedAmount || cumulative.toFixed(2),
        remainingBalance: row.remainingBalanceAfterLine || (totalAmount - cumulative).toFixed(2),
        recognitionDate: row.recognitionDate || row.periodEnd,
        dueDate: row.dueDate || row.periodEnd,
        postingStatus: 'SCHEDULED',
        scheduleVersion: ver,
        isFinalAdjustment: !!row.isFinalAdjustment,
        isLocked: false,
      }),
      { transaction }
    );
    created.push(line);
  }

  return created;
}

async function generateAndPersistSchedule(req, schedule, transaction) {
  const scheduleRows = calc.calculateMonthlySchedule(
    schedule.totalContractAmount,
    schedule.serviceStartDate,
    schedule.serviceEndDate,
    2
  );

  const totalDays = calc.calculateInclusiveDays(schedule.serviceStartDate, schedule.serviceEndDate);
  const dailyRate = calc.calculateDailyRate(schedule.totalContractAmount, totalDays);

  await schedule.update(
    {
      totalServiceDays: totalDays,
      dailyRate,
      scheduleStatus: 'GENERATED',
      status: schedule.status === 'DRAFT' ? 'SCHEDULE_GENERATED' : schedule.status,
      deferredBalance: schedule.totalContractAmount,
      remainingAmount: schedule.totalContractAmount,
      recognizedAmount: 0,
    },
    { transaction }
  );

  const lines = await persistScheduleLines(req, schedule, scheduleRows, transaction);
  return { schedule: scheduleRows, lines };
}

async function regenerateSchedule(req, schedule, transaction) {
  const existing = await loadScheduleLines(schedule.id, req, transaction);
  if (!canRegenerateSchedule(schedule, existing)) {
    const err = new Error('Schedule cannot be regenerated in current state');
    err.statusCode = 400;
    throw err;
  }
  await saveVersionSnapshot(req, schedule, 'Regenerate schedule', transaction);
  return generateAndPersistSchedule(req, schedule, transaction);
}

async function regenerateFutureLinesOnly(req, schedule, fromDate, newEndDate, newAmount, transaction) {
  const existing = await loadScheduleLines(schedule.id, req, transaction);
  const locked = existing.filter((l) => LOCKED_STATUSES.has(l.postingStatus) || l.isLocked);
  const unposted = existing.filter((l) => !LOCKED_STATUSES.has(l.postingStatus) && !l.isLocked);

  if (unposted.length) {
    await LeaseRevenueScheduleLine.destroy({
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
    const line = await LeaseRevenueScheduleLine.create(
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
    created.push(line);
  }
  return [...locked, ...created];
}

module.exports = {
  loadScheduleLines,
  canRegenerateSchedule,
  saveVersionSnapshot,
  persistScheduleLines,
  generateAndPersistSchedule,
  regenerateSchedule,
  regenerateFutureLinesOnly,
};
