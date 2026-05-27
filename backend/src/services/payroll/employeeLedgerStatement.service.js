const { PayrollExport } = require('../../models');
const { assertEmployeeInCompany } = require('../../utils/companyScope');
const { getEmployeeLedger } = require('./employeeLedger.service');
const { renderAndSavePdf } = require('./payrollDocumentRender.service');

async function generateLedgerStatement({ req, employeeId }) {
  await assertEmployeeInCompany(employeeId, req);
  const header = await getEmployeeLedger(req.companyId, employeeId);
  if (!header) {
    const err = new Error('No employee ledger found');
    err.statusCode = 404;
    throw err;
  }

  const lines = header.lines || [];
  const opening = lines.length ? Number(lines[0].balance) - Number(lines[0].credit) + Number(lines[0].debit) : 0;
  const closing = lines.length ? Number(lines[lines.length - 1].balance) : 0;

  const snapshot = {
    employeeId,
    ledgerHeaderId: header.id,
    openingBalance: opening,
    closingBalance: closing,
    lines: lines.map((l) => ({
      date: l.transactionDate,
      sourceType: l.sourceType,
      description: l.description,
      debit: Number(l.debit),
      credit: Number(l.credit),
      balance: Number(l.balance),
    })),
  };

  const rows = snapshot.lines.map((l) => [
    String(l.date),
    l.sourceType,
    l.description || '',
    String(l.debit),
    String(l.credit),
    String(l.balance),
  ]);

  const fileName = `LEDGER-${employeeId}-${Date.now()}.pdf`;
  const { relativePath: filePath } = await renderAndSavePdf({
    companyId: req.companyId,
    documentType: 'EMPLOYEE_LEDGER',
    fileName,
    title: 'Employee Ledger Statement',
    sections: {
      blocks: [
        {
          heading: 'Period summary',
          lines: [`Opening: ${opening}`, `Closing: ${closing}`],
        },
        {
          heading: 'Transactions',
          table: {
            headers: ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance'],
            rows,
          },
        },
      ],
    },
  });

  const exp = await PayrollExport.create({
    companyId: req.companyId,
    exportType: 'EMPLOYEE_LEDGER_STATEMENT',
    format: 'pdf',
    filePath,
    parameters: snapshot,
    generatedBy: req.user?.id,
    generatedAt: new Date(),
  });

  return { export: exp, snapshot };
}

module.exports = { generateLedgerStatement };
