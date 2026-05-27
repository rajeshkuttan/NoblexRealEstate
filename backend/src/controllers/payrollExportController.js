const fs = require('fs');
const path = require('path');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { resolveAbsolute } = require('../services/payroll/payrollDocumentPaths');
const { createExport, listExports, getExport, REPORT_TYPES } = require('../services/payroll/payrollExport.service');

exports.listTypes = async (req, res) => {
  res.json({ success: true, data: REPORT_TYPES });
};

exports.list = async (req, res, next) => {
  try {
    const data = await listExports(req);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { report_type, format, parameters } = req.body;
    if (!report_type || !format) {
      return res.status(400).json({ message: 'report_type and format are required' });
    }
    const exp = await createExport({
      req,
      reportType: report_type,
      format,
      parameters: parameters || {},
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_EXPORT_GENERATED,
      entityId: req.companyId,
      metadata: { export_id: exp.id, report_type, format },
    });
    res.json({ success: true, data: exp });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.download = async (req, res, next) => {
  try {
    const row = await getExport(req, Number(req.params.id));
    if (!row.filePath) return res.status(404).json({ message: 'File not found' });
    const abs = resolveAbsolute(row.filePath);
    if (!abs || !fs.existsSync(abs)) return res.status(404).json({ message: 'File not found' });
    const ext = path.extname(abs).toLowerCase();
    const types = { '.pdf': 'application/pdf', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.csv': 'text/csv' };
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="export-${row.id}${ext}"`);
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
