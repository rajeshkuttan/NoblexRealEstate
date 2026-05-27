const fs = require('fs');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { resolveAbsolute } = require('../services/payroll/payrollDocumentPaths');
const {
  generateCertificate,
  listCertificates,
} = require('../services/payroll/payrollSalaryCertificate.service');
const { PayrollExport } = require('../models');
const { companyWhere } = require('../utils/companyScope');

exports.list = async (req, res, next) => {
  try {
    const data = await listCertificates(req);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const employeeId = req.body.employee_id;
    const certificateType = req.body.certificate_type || 'SALARY';
    if (!employeeId) return res.status(400).json({ message: 'employee_id is required' });
    const result = await generateCertificate({
      req,
      employeeId: Number(employeeId),
      certificateType,
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.SALARY_CERTIFICATE_GENERATED,
      entityId: req.companyId,
      metadata: { export_id: result.export.id, employee_id: employeeId, type: certificateType },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.download = async (req, res, next) => {
  try {
    const row = await PayrollExport.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!row?.filePath) return res.status(404).json({ message: 'File not found' });
    const abs = resolveAbsolute(row.filePath);
    if (!abs || !fs.existsSync(abs)) return res.status(404).json({ message: 'File not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${row.id}.pdf"`);
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    next(e);
  }
};
