const {
  JournalVoucher,
  JournalVoucherDetail,
  ChartOfAccount,
  AccountsTrans,
} = require('../models');
const { companyWhere, withCompanyId, assertAccountInCompany } = require('../utils/companyScope');
const {
  createCompanyAccountingEntry,
  COMPANY_AUDIT_ACTIONS,
} = require('./companyAccountingEntry.service');
const { round2 } = require('./investment/investmentFinancePostingUtils');

async function getNextAccountsTransNo(transaction) {
  const last = await AccountsTrans.findOne({
    order: [['transactionNo', 'DESC']],
    transaction,
  });
  if (!last || !last.transactionNo || last.transactionNo < 100000) return 100000;
  return last.transactionNo + 1;
}

/**
 * Create a posted system JV header + details + GL lines in one transaction.
 * @param {object} params
 * @param {object} params.req - request with companyId, user
 * @param {object} params.transaction - Sequelize transaction
 * @param {string} params.jvNumber - external reference (e.g. ITX-0001)
 * @param {string|Date} params.date - posting date
 * @param {string} params.narration
 * @param {Array<{ledgerId:number,debit:number,credit:number,narration?:string}>} params.lines
 * @param {string} params.sourceType - audit source type
 * @param {number} params.sourceId
 * @param {string} [params.auditAction]
 */
async function createPostedSystemJournalVoucher({
  req,
  transaction,
  jvNumber,
  date,
  narration,
  lines,
  sourceType,
  sourceId,
  auditAction = COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_CREATED,
}) {
  if (!lines || !lines.length) {
    const err = new Error('Journal voucher requires at least one line');
    err.statusCode = 400;
    throw err;
  }

  const existing = await JournalVoucher.findOne({
    where: { jvNumber, ...companyWhere(req), status: 'posted' },
    transaction,
  });
  if (existing) {
    const err = new Error(`Journal voucher ${jvNumber} already posted`);
    err.statusCode = 400;
    throw err;
  }

  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of lines) {
    totalDebit += round2(line.debit || 0);
    totalCredit += round2(line.credit || 0);
  }
  if (round2(totalDebit) !== round2(totalCredit)) {
    const err = new Error(`Unbalanced JV: Dr ${totalDebit} Cr ${totalCredit}`);
    err.statusCode = 400;
    throw err;
  }

  const userId = req.user?.id || 1;
  const voucher = await JournalVoucher.create(
    withCompanyId(req, {
      jvNumber,
      date,
      narration: narration || `System JV ${jvNumber}`,
      totalDebit,
      totalCredit,
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
    }),
    { transaction }
  );

  for (const line of lines) {
    const debit = round2(line.debit || 0);
    const credit = round2(line.credit || 0);
    await assertAccountInCompany(line.ledgerId, req);
    await JournalVoucherDetail.create(
      withCompanyId(req, {
        jvId: voucher.id,
        ledgerId: line.ledgerId,
        debitAmount: debit,
        creditAmount: credit,
        particularType: 'Other',
        narration: line.narration || narration,
      }),
      { transaction }
    );

    const account = await ChartOfAccount.findOne({
      where: { id: line.ledgerId, ...companyWhere(req) },
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

  let nextTransNo = await getNextAccountsTransNo(transaction);
  const atLines = lines.map((line) => {
    const debit = round2(line.debit || 0);
    const credit = round2(line.credit || 0);
    const row = {
      transactionNo: nextTransNo++,
      transactionDate: date,
      jvNumber,
      jvId: voucher.id,
      crDr: debit > 0 ? 'Dr' : 'Cr',
      particular: line.narration || narration || 'Investment',
      ledgerId: line.ledgerId,
      debitAmount: debit,
      creditAmount: credit,
      narration: line.narration || narration,
      particularType: 'Other',
    };
    if (line.extraFields) Object.assign(row, line.extraFields);
    return row;
  });

  const created = await createCompanyAccountingEntry({
    companyId: req.companyId,
    lines: atLines.map((row) => ({ ...row, companyId: req.companyId })),
    transaction,
    req,
    sourceType,
    sourceId,
    auditAction,
  });

  return { voucher, accountsTransLines: created };
}

module.exports = {
  createPostedSystemJournalVoucher,
};
