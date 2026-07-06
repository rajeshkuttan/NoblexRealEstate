'use strict';

const { round2 } = require('../../services/investment/investmentFinancePostingUtils');

function assertBalancedGlLines(lines) {
  let dr = 0;
  let cr = 0;
  for (const l of lines) {
    dr += Number(l.debitAmount || 0);
    cr += Number(l.creditAmount || 0);
  }
  return round2(dr) === round2(cr);
}

function validatePostedTransaction(txn, glLines, jv) {
  const errors = [];
  if (!txn.journalVoucherId) errors.push(`${txn.transactionNo}: missing journal_voucher_id`);
  if (!jv) errors.push(`${txn.transactionNo}: JV header not found`);
  if (jv && jv.status !== 'posted') errors.push(`${txn.transactionNo}: JV not posted`);
  if (!glLines.length && !['BONUS', 'SPLIT'].includes(txn.transactionType)) {
    errors.push(`${txn.transactionNo}: no GL lines`);
  }
  if (glLines.length && !assertBalancedGlLines(glLines)) {
    errors.push(`${txn.transactionNo}: unbalanced GL`);
  }
  for (const line of glLines) {
    if (!line.jvId) errors.push(`${txn.transactionNo}: GL line missing jv_id`);
  }
  return errors;
}

module.exports = { assertBalancedGlLines, validatePostedTransaction };
