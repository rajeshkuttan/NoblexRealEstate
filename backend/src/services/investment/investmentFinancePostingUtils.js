const { AccountsTrans } = require('../../models');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function round4(n) {
  return Math.round(Number(n) * 10000) / 10000;
}

function round6(n) {
  return Math.round(Number(n) * 1000000) / 1000000;
}

async function getNextTransactionNo(transaction) {
  const last = await AccountsTrans.findOne({
    order: [['transactionNo', 'DESC']],
    transaction,
  });
  if (!last || !last.transactionNo || last.transactionNo < 100000) return 100000;
  return last.transactionNo + 1;
}

function assertBalanced(lines) {
  let dr = 0;
  let cr = 0;
  for (const l of lines) {
    dr += Number(l.debitAmount || 0);
    cr += Number(l.creditAmount || 0);
  }
  if (round2(dr) !== round2(cr)) {
    const err = new Error(`Unbalanced posting: Dr ${dr} Cr ${cr}`);
    err.statusCode = 400;
    throw err;
  }
}

function buildAtLine({ transactionNo, transactionDate, jvNumber, jvId, ledgerId, debit, credit, narration, investmentTransactionId }) {
  const d = round2(debit || 0);
  const c = round2(credit || 0);
  return {
    transactionNo,
    transactionDate,
    jvNumber,
    jvId: jvId || null,
    crDr: d > 0 ? 'Dr' : 'Cr',
    particular: narration || 'Investment',
    ledgerId,
    debitAmount: d,
    creditAmount: c,
    narration,
    investmentTransactionId: investmentTransactionId || null,
  };
}

module.exports = { round2, round4, round6, getNextTransactionNo, assertBalanced, buildAtLine };
