const fs = require('fs');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { resolveAbsolute } = require('../services/payroll/payrollDocumentPaths');
const {
  generatePayslip,
  generateBatchPayslips,
  publishPayslips,
  voidPayslip,
  listPayslips,
} = require('../services/payroll/payrollPayslip.service');
const { PayrollPayslip } = require('../models');
const { companyWhere } = require('../utils/companyScope');

exports.list = async (req, res, next) => {
  try {
    const data = await listPayslips(req, req.query);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const row = await PayrollPayslip.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!row) return res.status(404).json({ message: 'Payslip not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const payrollRunEmployeeId = req.body.payroll_run_employee_id;
    if (!payrollRunEmployeeId) {
      return res.status(400).json({ message: 'payroll_run_employee_id is required' });
    }
    const payslip = await generatePayslip({ req, payrollRunEmployeeId: Number(payrollRunEmployeeId) });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYSLIP_GENERATED,
      entityId: req.companyId,
      metadata: { payslip_id: payslip.id, payslip_number: payslip.payslipNumber },
    });
    res.json({ success: true, data: payslip });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.batch = async (req, res, next) => {
  try {
    const payrollRunId = req.body.payroll_run_id || req.body.run_id;
    if (!payrollRunId) return res.status(400).json({ message: 'payroll_run_id is required' });
    const job = await generateBatchPayslips({ req, payrollRunId: Number(payrollRunId) });
    res.json({ success: true, data: job });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.publish = async (req, res, next) => {
  try {
    const payrollRunId = req.body.payroll_run_id || req.body.run_id;
    if (!payrollRunId) return res.status(400).json({ message: 'payroll_run_id is required' });
    const result = await publishPayslips({ req, payrollRunId: Number(payrollRunId) });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYSLIP_PUBLISHED,
      entityId: req.companyId,
      metadata: { payroll_run_id: payrollRunId, published: result.published },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.voidPayslip = async (req, res, next) => {
  try {
    const allowPublished = (req.userPermissions || []).includes('payroll.documents.publish');
    const payslip = await voidPayslip({
      req,
      payslipId: Number(req.params.id),
      allowPublished: !!allowPublished,
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYSLIP_VOIDED,
      entityId: req.companyId,
      metadata: { payslip_id: payslip.id },
    });
    res.json({ success: true, data: payslip });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.download = async (req, res, next) => {
  try {
    const row = await PayrollPayslip.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!row?.pdfPath) return res.status(404).json({ message: 'File not found' });
    const abs = resolveAbsolute(row.pdfPath);
    if (!abs || !fs.existsSync(abs)) return res.status(404).json({ message: 'File not found' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${row.payslipNumber}.pdf"`);
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    next(e);
  }
};
