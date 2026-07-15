'use strict';

const Decimal = require('decimal.js');
const { Op } = require('sequelize');
const {
  LeaseRevenueSchedule,
  LeaseRevenueScheduleLine,
  sequelize,
} = require('../../models');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../../utils/companyScope');
const { createPostedSystemJournalVoucher } = require('../systemJournalVoucher.service');
const { round2 } = require('../investment/investmentFinancePostingUtils');
const calc = require('./leaseRevenueCalculation.service');
const scheduleService = require('./leaseRevenueSchedule.service');

const SETTLEMENT_MODES = new Set(['REFUND', 'CREDIT', 'TRANSFER', 'FORFEIT', 'MIXED']);

async function terminateSchedule(req, scheduleId, body = {}) {
  const settlementMode = (body.settlementMode ?? body.settlement_mode ?? 'CREDIT').toUpperCase();
  if (!SETTLEMENT_MODES.has(settlementMode)) {
    const err = new Error(`Invalid settlement mode: ${settlementMode}`);
    err.statusCode = 400;
    throw err;
  }

  const effectiveDate = body.effectiveDate ?? body.effective_date ?? body.terminatedOn ?? new Date().toISOString().slice(0, 10);
  const reason = body.reason ?? body.terminationReason ?? 'Early termination';

  return sequelize.transaction(async (transaction) => {
    const schedule = await assertRecordInCompany(LeaseRevenueSchedule, scheduleId, req, { transaction });

    const unposted = await LeaseRevenueScheduleLine.findAll({
      where: {
        scheduleId: schedule.id,
        postingStatus: { [Op.notIn]: ['POSTED', 'DRAFT_JV_CREATED', 'REVERSED'] },
        periodStartDate: { [Op.gt]: effectiveDate },
      },
      transaction,
    });
    if (unposted.length) {
      await LeaseRevenueScheduleLine.destroy({
        where: { id: unposted.map((l) => l.id) },
        transaction,
      });
    }

    const posted = await LeaseRevenueScheduleLine.findAll({
      where: {
        scheduleId: schedule.id,
        postingStatus: { [Op.in]: ['POSTED', 'DRAFT_JV_CREATED'] },
      },
      transaction,
    });
    const recognized = posted.reduce((s, l) => s + parseFloat(l.scheduledAmount), 0);
    const remainingDeferred = new Decimal(schedule.totalContractAmount).minus(recognized);

    if (remainingDeferred.gt(0) && calc.parseDateOnly(effectiveDate) <= calc.parseDateOnly(schedule.serviceEndDate)) {
      const tail = calc.calculateMonthlySchedule(
        remainingDeferred.toFixed(2),
        effectiveDate,
        effectiveDate,
        2
      );
      if (tail.length) {
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
              isFinalAdjustment: true,
            }),
            { transaction }
          );
        }
      }
    }

    await scheduleService.saveVersionSnapshot(req, schedule, `Termination ${effectiveDate}`, transaction);

    const settlementAmount = parseFloat(body.settlementAmount ?? body.settlement_amount ?? remainingDeferred.toFixed(2));
    let settlementJv = null;

    if (settlementAmount > 0 && schedule.deferredRevenueAccountId) {
      const jvLines = buildSettlementJvLines(schedule, settlementAmount, settlementMode, body);
      if (jvLines.length) {
        const result = await createPostedSystemJournalVoucher({
          req,
          transaction,
          jvNumber: `LRS-TERM-${schedule.scheduleNumber}`,
          date: effectiveDate,
          narration: `Lease revenue termination settlement (${settlementMode}) — ${schedule.scheduleNumber}`,
          lines: jvLines,
          sourceType: 'lease_revenue_termination',
          sourceId: schedule.id,
        });
        settlementJv = result.voucher;
      }
    }

    await schedule.update({
      serviceEndDate: effectiveDate,
      terminatedOn: effectiveDate,
      terminationReason: reason,
      status: 'TERMINATED',
      deferredBalance: Decimal.max(remainingDeferred.minus(settlementAmount), 0).toFixed(2),
      remainingAmount: Decimal.max(remainingDeferred.minus(settlementAmount), 0).toFixed(2),
      totalServiceDays: calc.calculateInclusiveDays(schedule.serviceStartDate, effectiveDate),
    }, { transaction });

    return { schedule: await schedule.reload({ transaction }), settlementJv, settlementMode, settlementAmount };
  });
}

function buildSettlementJvLines(schedule, amount, mode, body) {
  const amt = round2(amount);
  const deferredId = schedule.deferredRevenueAccountId;
  if (!deferredId || amt <= 0) return [];

  const lines = [{ ledgerId: deferredId, debit: amt, credit: 0, narration: 'Deferred revenue settlement' }];

  if (mode === 'REFUND') {
    const bankId = body.bankAccountId ?? body.bank_account_id ?? schedule.receivableAccountId;
    if (bankId) {
      lines.push({ ledgerId: bankId, debit: 0, credit: amt, narration: 'Tenant refund' });
    }
  } else if (mode === 'CREDIT') {
    const recvId = schedule.receivableAccountId;
    if (recvId) {
      lines.push({ ledgerId: recvId, debit: 0, credit: amt, narration: 'Tenant credit note' });
    }
  } else if (mode === 'TRANSFER') {
    const targetId = body.transferAccountId ?? body.transfer_account_id;
    if (targetId) {
      lines.push({ ledgerId: targetId, debit: 0, credit: amt, narration: 'Deferred revenue transfer' });
    }
  } else if (mode === 'FORFEIT') {
    if (schedule.revenueAccountId) {
      lines.push({ ledgerId: schedule.revenueAccountId, debit: 0, credit: amt, narration: 'Forfeited deferred revenue' });
    }
  } else if (mode === 'MIXED') {
    const splits = body.settlementSplits ?? body.settlement_splits ?? [];
    for (const split of splits) {
      const slice = round2(split.amount || 0);
      if (slice > 0 && split.accountId) {
        lines.push({ ledgerId: split.accountId, debit: 0, credit: slice, narration: split.narration || 'Mixed settlement' });
      }
    }
  }

  if (lines.length < 2) return [];
  return lines;
}

module.exports = {
  terminateSchedule,
  buildSettlementJvLines,
  SETTLEMENT_MODES,
};
