const fs = require('fs');
const { generateLedgerStatement } = require('../services/payroll/employeeLedgerStatement.service');
const { PayrollExport } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { resolveAbsolute } = require('../services/payroll/payrollDocumentPaths');

exports.generate = async (req, res, next) => {
  try {
    const employeeId = req.body.employee_id;
    if (!employeeId) return res.status(400).json({ message: 'employee_id is required' });
    const result = await generateLedgerStatement({ req, employeeId: Number(employeeId) });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.download = async (req, res, next) => {
  try {
    const row = await PayrollExport.findOne({
      where: { id: req.params.id, exportType: 'EMPLOYEE_LEDGER_STATEMENT', ...companyWhere(req) },
    });
    if (!row?.filePath) return res.status(404).json({ message: 'File not found' });
    const abs = resolveAbsolute(row.filePath);
    if (!abs || !fs.existsSync(abs)) return res.status(404).json({ message: 'File not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ledger-${row.id}.pdf"`);
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    next(e);
  }
};
