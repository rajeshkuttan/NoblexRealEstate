const { EmployeeLedgerHeader, EmployeeLedgerLine } = require('../../models');
const { round2 } = require('./payrollFinancePostingUtils');

async function ensureLedgerHeader(companyId, employeeId) {
  let header = await EmployeeLedgerHeader.findOne({ where: { companyId, employeeId } });
  if (!header) {
    const last = await EmployeeLedgerHeader.findOne({
      where: { companyId },
      order: [['ledgerNo', 'DESC']],
    });
    header = await EmployeeLedgerHeader.create({
      companyId,
      employeeId,
      ledgerNo: (last?.ledgerNo || 0) + 1,
      status: 'ACTIVE',
    });
  }
  return header;
}

async function appendLedgerLines({ companyId, employeeId, sourceType, sourceId, referenceNo, transactionDate, entries }) {
  const header = await ensureLedgerHeader(companyId, employeeId);
  const lastLine = await EmployeeLedgerLine.findOne({
    where: { companyId, ledgerHeaderId: header.id },
    order: [['id', 'DESC']],
  });
  let balance = Number(lastLine?.balance || 0);
  const created = [];

  for (const entry of entries) {
    const debit = round2(entry.debit || 0);
    const credit = round2(entry.credit || 0);
    balance = round2(balance + credit - debit);
    const line = await EmployeeLedgerLine.create({
      companyId,
      ledgerHeaderId: header.id,
      transactionDate: transactionDate || new Date().toISOString().slice(0, 10),
      sourceType,
      sourceId,
      referenceNo,
      description: entry.description,
      debit,
      credit,
      balance,
    });
    created.push(line);
  }

  return { header, lines: created };
}

async function getEmployeeLedger(companyId, employeeId) {
  const header = await EmployeeLedgerHeader.findOne({
    where: { companyId, employeeId },
    include: [{ model: EmployeeLedgerLine, as: 'lines', order: [['id', 'ASC']] }],
  });
  return header;
}

module.exports = { ensureLedgerHeader, appendLedgerLines, getEmployeeLedger };
