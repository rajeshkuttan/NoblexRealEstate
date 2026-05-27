const fs = require('fs');
const {
  prepareDistributionPackage,
  buildArchiveZip,
  listQueue,
  markQueueReady,
} = require('../services/payroll/payrollDocumentDistribution.service');
const { resolveAbsolute } = require('../services/payroll/payrollDocumentPaths');

exports.prepare = async (req, res, next) => {
  try {
    const rows = await prepareDistributionPackage({
      req,
      documentRefs: req.body.document_refs || [req.body],
      recipientEmail: req.body.recipient_email,
      recipientName: req.body.recipient_name,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.archive = async (req, res, next) => {
  try {
    const result = await buildArchiveZip({
      req,
      exportIds: req.body.export_ids || [],
      payslipIds: req.body.payslip_ids || [],
    });
    if (req.query.download === '1') {
      const abs = resolveAbsolute(result.relativePath);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="payroll-package.zip"`);
      return fs.createReadStream(abs).pipe(res);
    }
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.queue = async (req, res, next) => {
  try {
    const data = await listQueue(req);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.markReady = async (req, res, next) => {
  try {
    const row = await markQueueReady(req, Number(req.params.id));
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
