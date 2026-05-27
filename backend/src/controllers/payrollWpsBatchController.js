const { Op } = require('sequelize');
const { PayrollWpsBatch, PayrollWpsEmployeeLine, PayrollWpsSifExport } = require('../models');
const { companyWhere, stripCompanyFromBody, assertRecordInCompany } = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const {
  generateWpsBatch,
  getBatchWithLines,
  reviewBatch,
  approveBatch,
  exportBatch,
  cancelBatch,
} = require('../services/payroll/payrollWpsBatchService');

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.payroll_run_id) where.payrollRunId = req.query.payroll_run_id;
    if (req.query.status) where.status = req.query.status;
    const rows = await PayrollWpsBatch.findAll({ where, order: [['id', 'DESC']] });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const batch = await getBatchWithLines(req.companyId, req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json({ success: true, data: batch });
  } catch (e) {
    next(e);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const payrollRunId = body.payroll_run_id;
    if (!payrollRunId) return res.status(400).json({ message: 'payroll_run_id is required' });

    try {
      const { batch } = await generateWpsBatch({
        companyId: req.companyId,
        payrollRunId: Number(payrollRunId),
        userId: req.user?.id,
      });
      await logCompanyEvent({
        req,
        action: COMPANY_AUDIT_ACTIONS.WPS_BATCH_GENERATED,
        entityId: req.companyId,
        metadata: { batch_id: batch.id, payroll_run_id: payrollRunId },
      });
      const full = await getBatchWithLines(req.companyId, batch.id);
      res.status(201).json({ success: true, data: full });
    } catch (e) {
      if (e.compliance) {
        await logCompanyEvent({
          req,
          action: COMPANY_AUDIT_ACTIONS.COMPLIANCE_EXCEPTION_FOUND,
          entityId: req.companyId,
          metadata: { payroll_run_id: payrollRunId, issues: e.compliance.issues },
        });
        await logCompanyEvent({
          req,
          action: COMPANY_AUDIT_ACTIONS.WPS_VALIDATION_FAILED,
          entityId: req.companyId,
          metadata: { payroll_run_id: payrollRunId },
        });
        return res.status(400).json({ message: e.message, compliance: e.compliance });
      }
      throw e;
    }
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.review = async (req, res, next) => {
  try {
    const batch = await reviewBatch(req.companyId, req.params.id);
    res.json({ success: true, data: batch });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const batch = await approveBatch(req.companyId, req.params.id, req.user?.id);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.WPS_BATCH_APPROVED,
      entityId: req.companyId,
      metadata: { batch_id: batch.id },
    });
    res.json({ success: true, data: batch });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.export = async (req, res, next) => {
  try {
    const { fileName, content, batch } = await exportBatch(req.companyId, req.params.id, req.user?.id);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.WPS_BATCH_EXPORTED,
      entityId: req.companyId,
      metadata: { batch_id: batch.id, file_name: fileName },
    });
    if (req.query.download === '1' || req.query.download === 'true') {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      return res.send(content);
    }
    res.json({ success: true, data: { file_name: fileName, content, batch } });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const batch = await cancelBatch(req.companyId, req.params.id);
    res.json({ success: true, data: batch });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
