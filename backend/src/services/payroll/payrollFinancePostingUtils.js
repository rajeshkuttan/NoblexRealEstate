const { AccountsTrans } = require('../../models');

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
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

function buildAtLine({ transactionNo, transactionDate, jvNumber, ledgerId, debit, credit, narration, payrollRunId, payrollSettlementId, payrollWpsBatchId }) {
  const d = round2(debit || 0);
  const c = round2(credit || 0);
  return {
    transactionNo,
    transactionDate,
    jvNumber,
    crDr: d > 0 ? 'Dr' : 'Cr',
    particular: narration || 'Payroll',
    ledgerId,
    debitAmount: d,
    creditAmount: c,
    narration,
    payrollRunId: payrollRunId || null,
    payrollSettlementId: payrollSettlementId || null,
    payrollWpsBatchId: payrollWpsBatchId || null,
  };
}

module.exports = { round2, getNextTransactionNo, assertBalanced, buildAtLine };
