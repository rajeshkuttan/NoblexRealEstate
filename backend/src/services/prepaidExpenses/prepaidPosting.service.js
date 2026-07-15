'use strict';

const Decimal = require('decimal.js');
const { Op } = require('sequelize');
const {
  PrepaidExpense,
  PrepaidExpenseScheduleLine,
  PrepaidExpenseAllocation,
  PrepaidExpensePostingBatch,
  JournalVoucher,
  JournalVoucherDetail,
  ChartOfAccount,
  AccountsTrans,
  sequelize,
} = require('../../models');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../../utils/companyScope');
const periodValidation = require('../periodValidationService');
const companyDocumentNumber = require('../companyDocumentNumber.service');
const { createPostedSystemJournalVoucher } = require('../systemJournalVoucher.service');
const {
  createCompanyAccountingEntry,
  COMPANY_AUDIT_ACTIONS,
} = require('../companyAccountingEntry.service');
const { round2 } = require('../investment/investmentFinancePostingUtils');
const { generatePostingBatchNumber } = require('./prepaidDocumentNumber.service');

async function getNextAccountsTransNo(transaction) {
  const last = await AccountsTrans.findOne({
    order: [['transactionNo', 'DESC']],
    transaction,
  });
  if (!last || !last.transactionNo || last.transactionNo < 100000) return 100000;
  return last.transactionNo + 1;
}

/**
 * Post an existing open draft JV (balances + AccountsTrans) inside the caller transaction.
 */
async function finalizeOpenDraftJv(req, voucher, transaction) {
  if (!voucher) {
    const err = new Error('Journal voucher not found');
    err.statusCode = 404;
    throw err;
  }
  if (voucher.status === 'posted') return voucher;
  if (voucher.status === 'cancelled') {
    const err = new Error('Cannot post a cancelled journal voucher');
    err.statusCode = 400;
    throw err;
  }

  await periodValidation.validatePostingDate(req, voucher.date);

  const details = await JournalVoucherDetail.findAll({
    where: { jvId: voucher.id, ...companyWhere(req) },
    transaction,
  });
  if (!details.length) {
    const err = new Error('Journal voucher has no lines');
    err.statusCode = 400;
    throw err;
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const d of details) {
    totalDebit += round2(d.debitAmount || 0);
    totalCredit += round2(d.creditAmount || 0);
  }
  if (round2(totalDebit) !== round2(totalCredit)) {
    const err = new Error(`Unbalanced JV: Dr ${totalDebit} Cr ${totalCredit}`);
    err.statusCode = 400;
    throw err;
  }

  let nextTransNo = await getNextAccountsTransNo(transaction);
  const atLines = [];
  for (const detail of details) {
    const debit = round2(detail.debitAmount || 0);
    const credit = round2(detail.creditAmount || 0);
    atLines.push({
      transactionNo: nextTransNo++,
      transactionDate: voucher.date,
      jvNumber: voucher.jvNumber,
      jvId: voucher.id,
      crDr: debit > 0 ? 'Dr' : 'Cr',
      particular: detail.narration || voucher.narration || 'Prepaid recognition',
      ledgerId: detail.ledgerId,
      debitAmount: debit,
      creditAmount: credit,
      narration: detail.narration || voucher.narration,
      particularType: 'Other',
      companyId: req.companyId,
    });

    const account = await ChartOfAccount.findOne({
      where: { id: detail.ledgerId, ...companyWhere(req) },
      transaction,
    });
    if (account) {
      const amount = debit > 0 ? debit : credit;
      const type = debit > 0 ? 'Dr' : 'Cr';
      const isNormalDebit = ['asset', 'expense'].includes(account.accountType);
      const change = type === 'Dr'
        ? (isNormalDebit ? amount : -amount)
        : (isNormalDebit ? -amount : amount);
      await account.update({
        balance: round2(parseFloat(account.balance || 0) + change),
      }, { transaction });
    }
  }

  await createCompanyAccountingEntry({
    companyId: req.companyId,
    lines: atLines,
    transaction,
    req,
    sourceType: 'prepaid_expense',
    sourceId: voucher.id,
    auditAction: COMPANY_AUDIT_ACTIONS.JV_POSTED,
  });

  const userId = req.user?.id || 1;
  await voucher.update({
    status: 'posted',
    postedBy: userId,
    postedAt: new Date(),
  }, { transaction });

  return voucher.reload({ transaction });
}

function roundAllocations(amount, allocations) {
  if (!allocations?.length) return [{ expenseAccountId: null, amount: round2(amount) }];
  const total = new Decimal(amount);
  const rows = [];
  let sum = new Decimal(0);
  for (let i = 0; i < allocations.length; i += 1) {
    const pct = new Decimal(allocations[i].allocationPercentage || 0).div(100);
    const slice = i === allocations.length - 1
      ? total.minus(sum)
      : total.times(pct).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    sum = sum.plus(slice);
    rows.push({
      expenseAccountId: allocations[i].expenseAccountId || allocations[i].expense_account_id,
      amount: slice.toNumber(),
      allocation: allocations[i],
    });
  }
  return rows;
}

async function buildRecognitionJvLines(expense, lineAmount, allocations) {
  const slices = roundAllocations(lineAmount, allocations);
  const jvLines = [];
  for (const slice of slices) {
    const ledgerId = slice.expenseAccountId || expense.expenseAccountId;
    jvLines.push({
      ledgerId,
      debit: round2(slice.amount),
      credit: 0,
      narration: `Prepaid recognition ${expense.prepaidNumber}`,
    });
  }
  jvLines.push({
    ledgerId: expense.prepaidAssetAccountId,
    debit: 0,
    credit: round2(lineAmount),
    narration: `Prepaid recognition ${expense.prepaidNumber}`,
  });
  return jvLines;
}

async function createDraftJv(req, expense, scheduleLine, transaction) {
  const postingDate = scheduleLine.recognitionDate || scheduleLine.periodEndDate;
  await periodValidation.validatePostingDate(req, postingDate);

  const allocations = await PrepaidExpenseAllocation.findAll({
    where: { prepaidExpenseId: expense.id, ...companyWhere(req) },
    transaction,
  });

  const jvLines = await buildRecognitionJvLines(expense, parseFloat(scheduleLine.scheduledAmount), allocations);
  let totalDebit = 0;
  let totalCredit = 0;
  for (const l of jvLines) {
    totalDebit += round2(l.debit);
    totalCredit += round2(l.credit);
  }

  let jvNumber = await companyDocumentNumber.generateDocumentNumber({
    companyId: req.companyId,
    documentType: 'journal_voucher',
    transaction,
  });
  if (!jvNumber) jvNumber = `JV-PPD-${scheduleLine.id}`;

  const voucher = await JournalVoucher.create(
    withCompanyId(req, {
      jvNumber,
      date: postingDate,
      narration: `Prepaid expense recognition — ${expense.prepaidNumber} line ${scheduleLine.lineNumber}`,
      totalDebit,
      totalCredit,
      status: 'open',
      createdBy: req.user?.id || 1,
    }),
    { transaction }
  );

  for (const line of jvLines) {
    await JournalVoucherDetail.create(
      withCompanyId(req, {
        jvId: voucher.id,
        ledgerId: line.ledgerId,
        debitAmount: round2(line.debit),
        creditAmount: round2(line.credit),
        particularType: 'Other',
        narration: line.narration,
      }),
      { transaction }
    );
  }

  await scheduleLine.update(
    {
      journalVoucherId: voucher.id,
      journalVoucherNumber: jvNumber,
      postingStatus: 'DRAFT_JV_CREATED',
      isLocked: true,
    },
    { transaction }
  );

  return voucher;
}

async function postScheduleLine(req, expense, scheduleLine, transaction, { autoPost = false } = {}) {
  if (scheduleLine.postingStatus === 'POSTED') {
    const err = new Error('Schedule line already posted');
    err.statusCode = 400;
    throw err;
  }

  const postingDate = scheduleLine.recognitionDate || scheduleLine.periodEndDate;
  await periodValidation.validatePostingDate(req, postingDate);

  const allocations = await PrepaidExpenseAllocation.findAll({
    where: { prepaidExpenseId: expense.id, ...companyWhere(req) },
    transaction,
  });
  const amount = parseFloat(scheduleLine.scheduledAmount);
  const jvLines = await buildRecognitionJvLines(expense, amount, allocations);

  let voucher;
  const wantPosted = Boolean(autoPost || expense.postingMode === 'AUTO_POST_JV');

  if (scheduleLine.journalVoucherId) {
    voucher = await JournalVoucher.findByPk(scheduleLine.journalVoucherId, { transaction });
    if (voucher?.status === 'posted') {
      // already posted — fall through to mark schedule line
    } else if (wantPosted && voucher) {
      voucher = await finalizeOpenDraftJv(req, voucher, transaction);
    } else if (voucher) {
      const err = new Error(
        'Draft JV already exists — open the JV to post it, or use Post all to GL'
      );
      err.statusCode = 400;
      throw err;
    }
  } else if (wantPosted) {
    const jvNumber =
      scheduleLine.journalVoucherNumber ||
      `PPD-JV-${expense.prepaidNumber}-${scheduleLine.lineNumber}`;
    const result = await createPostedSystemJournalVoucher({
      req,
      transaction,
      jvNumber,
      date: postingDate,
      narration: `Prepaid recognition ${expense.prepaidNumber} line ${scheduleLine.lineNumber}`,
      lines: jvLines,
      sourceType: 'prepaid_expense',
      sourceId: expense.id,
    });
    voucher = result.voucher;
  } else {
    voucher = await createDraftJv(req, expense, scheduleLine, transaction);
    return { voucher, draft: true };
  }

  const recognized = new Decimal(expense.recognizedAmount || 0).plus(amount);
  const remaining = new Decimal(expense.totalAmount).minus(recognized);

  await scheduleLine.update(
    {
      postingStatus: 'POSTED',
      postedAt: new Date(),
      postedBy: req.user?.id,
      journalVoucherId: voucher.id,
      journalVoucherNumber: voucher.jvNumber,
      isLocked: true,
    },
    { transaction }
  );

  let status = expense.status;
  if (remaining.lte(0)) status = 'FULLY_RECOGNIZED';
  else if (recognized.gt(0)) status = 'PARTIALLY_RECOGNIZED';

  await expense.update(
    {
      recognizedAmount: recognized.toFixed(2),
      remainingAmount: Decimal.max(remaining, 0).toFixed(2),
      status,
    },
    { transaction }
  );

  return { voucher, draft: false };
}

async function markDueLines(req, asOfDate) {
  const date = asOfDate || new Date().toISOString().slice(0, 10);
  const [count] = await PrepaidExpenseScheduleLine.update(
    { postingStatus: 'DUE' },
    {
      where: {
        ...companyWhere(req),
        postingStatus: 'SCHEDULED',
        dueDate: { [Op.lte]: date },
      },
    }
  );
  return count;
}

async function getPostingQueue(req, query = {}) {
  const where = {
    ...companyWhere(req),
    postingStatus: { [Op.in]: ['DUE', 'DRAFT_JV_CREATED', 'POSTING_READY'] },
  };
  if (query.recognitionMonth) where.recognitionMonth = query.recognitionMonth;

  return PrepaidExpenseScheduleLine.findAll({
    where,
    include: [
      {
        model: PrepaidExpense,
        as: 'prepaidExpense',
        where: { status: { [Op.in]: ['ACTIVE', 'PARTIALLY_RECOGNIZED'] } },
      },
    ],
    order: [['dueDate', 'ASC'], ['lineNumber', 'ASC']],
  });
}

async function postLines(req, prepaidExpenseId, { lineIds, autoPost } = {}) {
  return sequelize.transaction(async (transaction) => {
    const expense = await assertRecordInCompany(PrepaidExpense, prepaidExpenseId, req, { transaction });
    const where = { prepaidExpenseId, ...companyWhere(req) };
    if (lineIds?.length) where.id = { [Op.in]: lineIds };

    const lines = await PrepaidExpenseScheduleLine.findAll({
      where,
      order: [['lineNumber', 'ASC']],
      transaction,
    });

    const results = [];
    for (const line of lines) {
      if (['POSTED', 'REVERSED', 'CANCELLED'].includes(line.postingStatus)) continue;
      results.push(await postScheduleLine(req, expense, line, transaction, { autoPost }));
    }
    return results;
  });
}

async function postSingleLine(req, prepaidExpenseId, lineId, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const expense = await assertRecordInCompany(PrepaidExpense, prepaidExpenseId, req, { transaction });
    const line = await PrepaidExpenseScheduleLine.findOne({
      where: { id: lineId, prepaidExpenseId, ...companyWhere(req) },
      transaction,
    });
    if (!line) {
      const err = new Error('Schedule line not found');
      err.statusCode = 404;
      throw err;
    }
    return postScheduleLine(req, expense, line, transaction, options);
  });
}

async function reverseLine(req, prepaidExpenseId, lineId, { reason } = {}) {
  return sequelize.transaction(async (transaction) => {
    const expense = await assertRecordInCompany(PrepaidExpense, prepaidExpenseId, req, { transaction });
    const line = await PrepaidExpenseScheduleLine.findOne({
      where: { id: lineId, prepaidExpenseId, ...companyWhere(req) },
      transaction,
    });
    if (!line || line.postingStatus !== 'POSTED') {
      const err = new Error('Only posted lines can be reversed');
      err.statusCode = 400;
      throw err;
    }

    const amount = parseFloat(line.scheduledAmount);
    const revNumber = `REV-${line.journalVoucherNumber || line.id}`;
    await createPostedSystemJournalVoucher({
      req,
      transaction,
      jvNumber: revNumber,
      date: new Date().toISOString().slice(0, 10),
      narration: `Reversal: ${reason || 'Prepaid recognition reversal'}`,
      lines: [
        { ledgerId: expense.prepaidAssetAccountId, debit: round2(amount), credit: 0 },
        { ledgerId: expense.expenseAccountId, debit: 0, credit: round2(amount) },
      ],
      sourceType: 'prepaid_expense_reversal',
      sourceId: expense.id,
    });

    await line.update({
      postingStatus: 'REVERSED',
      reversedAt: new Date(),
      reversalReason: reason,
      isLocked: true,
    }, { transaction });

    const recognized = new Decimal(expense.recognizedAmount || 0).minus(amount);
    const remaining = new Decimal(expense.totalAmount).minus(recognized);
    await expense.update({
      recognizedAmount: Decimal.max(recognized, 0).toFixed(2),
      remainingAmount: remaining.toFixed(2),
      status: recognized.lte(0) ? 'ACTIVE' : 'PARTIALLY_RECOGNIZED',
    }, { transaction });

    return line;
  });
}

async function repostLine(req, prepaidExpenseId, lineId, options = {}) {
  await reverseLine(req, prepaidExpenseId, lineId, { reason: 'Repost reversal' });
  return sequelize.transaction(async (transaction) => {
    const line = await PrepaidExpenseScheduleLine.findOne({
      where: { id: lineId, prepaidExpenseId, ...companyWhere(req) },
      transaction,
    });
    await line.update({ postingStatus: 'DUE', isLocked: false, journalVoucherId: null, journalVoucherNumber: null }, { transaction });
    const expense = await assertRecordInCompany(PrepaidExpense, prepaidExpenseId, req, { transaction });
    return postScheduleLine(req, expense, line, transaction, options);
  });
}

async function createPostingBatch(req, { postingDate, lineIds, postingMode }) {
  return sequelize.transaction(async (transaction) => {
    const batchNumber = await generatePostingBatchNumber(req, transaction);
    const batch = await PrepaidExpensePostingBatch.create(
      withCompanyId(req, {
        batchNumber,
        postingDate: postingDate || new Date().toISOString().slice(0, 10),
        postingMode: postingMode || 'AUTO_CREATE_DRAFT_JV',
        status: 'DRAFT',
        createdBy: req.user?.id || 1,
      }),
      { transaction }
    );

    if (lineIds?.length) {
      await PrepaidExpenseScheduleLine.update(
        { postingBatchId: batch.id },
        { where: { id: { [Op.in]: lineIds }, ...companyWhere(req) }, transaction }
      );
    }

    return batch;
  });
}

async function processPostingBatch(req, batchId) {
  return sequelize.transaction(async (transaction) => {
    const batch = await assertRecordInCompany(PrepaidExpensePostingBatch, batchId, req, { transaction });
    await batch.update({ status: 'VALIDATING', startedAt: new Date() }, { transaction });

    const lines = await PrepaidExpenseScheduleLine.findAll({
      where: { postingBatchId: batchId, ...companyWhere(req) },
      include: [{ model: PrepaidExpense, as: 'prepaidExpense' }],
      transaction,
    });

    let ok = 0;
    let fail = 0;
    const errors = [];
    let totalAmount = new Decimal(0);

    for (const line of lines) {
      try {
        const expense = line.prepaidExpense;
        const autoPost = batch.postingMode === 'AUTO_POST_JV';
        await postScheduleLine(req, expense, line, transaction, { autoPost });
        ok += 1;
        totalAmount = totalAmount.plus(line.scheduledAmount || 0);
      } catch (e) {
        fail += 1;
        errors.push(`Line ${line.id}: ${e.message}`);
        await line.update({ postingStatus: 'FAILED', failureReason: e.message }, { transaction });
      }
    }

    let status = 'COMPLETED';
    if (fail && ok) status = 'PARTIAL';
    else if (fail && !ok) status = 'FAILED';

    await batch.update({
      status,
      lineCount: lines.length,
      totalAmount: totalAmount.toFixed(2),
      completedAt: new Date(),
      errorSummary: errors.length ? errors.join('; ') : null,
    }, { transaction });

    return batch.reload({ transaction });
  });
}

async function runAutoDraftForDueLines(req, asOfDate) {
  await markDueLines(req, asOfDate);
  const queue = await getPostingQueue(req);
  const results = [];
  for (const line of queue) {
    if (line.postingStatus !== 'DUE') continue;
    const expense = line.prepaidExpense;
    if (!expense || expense.postingMode === 'MANUAL') continue;
    try {
      if (expense.postingMode === 'AUTO_POST_JV') {
        results.push(await postSingleLine(req, expense.id, line.id, { autoPost: true }));
      } else {
        results.push(await postSingleLine(req, expense.id, line.id, { autoPost: false }));
      }
    } catch (e) {
      results.push({ error: e.message, lineId: line.id });
    }
  }
  return results;
}

module.exports = {
  markDueLines,
  getPostingQueue,
  postLines,
  postSingleLine,
  reverseLine,
  repostLine,
  createPostingBatch,
  processPostingBatch,
  runAutoDraftForDueLines,
  createDraftJv,
};
