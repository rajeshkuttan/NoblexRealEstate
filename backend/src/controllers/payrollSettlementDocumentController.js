const fs = require('fs');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { resolveAbsolute } = require('../services/payroll/payrollDocumentPaths');
const { generateSettlementStatement } = require('../services/payroll/payrollSettlementStatement.service');
const { PayrollExport } = require('../models');
const { companyWhere } = require('../utils/companyScope');

exports.generate = async (req, res, next) => {
  try {
    const result = await generateSettlementStatement({
      req,
      settlementId: Number(req.params.settlementId),
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.SETTLEMENT_DOCUMENT_GENERATED,
      entityId: req.companyId,
      metadata: { export_id: result.export.id, settlement_id: req.params.settlementId },
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
      where: { id: req.params.id, exportType: 'SETTLEMENT_STATEMENT', ...companyWhere(req) },
    });
    if (!row?.filePath) return res.status(404).json({ message: 'File not found' });
    const abs = resolveAbsolute(row.filePath);
    if (!abs || !fs.existsSync(abs)) return res.status(404).json({ message: 'File not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="settlement-${row.id}.pdf"`);
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    next(e);
  }
};
