const path = require('path');
const fs = require('fs');
const { EmployeeDocument, Employee } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { listExpiringDocuments } = require('../services/payrollDocumentService');

exports.listByEmployee = async (req, res, next) => {
  try {
    await assertEmployeeInCompany(req.params.employeeId, req);
    const rows = await EmployeeDocument.findAll({
      where: { employeeId: req.params.employeeId, ...companyWhere(req) },
      order: [['expiryDate', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    await assertEmployeeInCompany(req.body.employeeId, req);
    const body = stripCompanyFromBody(req.body);
    if (req.file) {
      body.attachmentPath = `/uploads/payroll/${req.file.filename}`;
    }
    const row = await EmployeeDocument.create(withCompanyId(req, body));
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.DOCUMENT_UPLOADED,
      entityId: req.companyId,
      metadata: { company_id: req.companyId, employee_id: body.employeeId, document_id: row.id },
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(EmployeeDocument, req.params.id, req);
    const body = stripCompanyFromBody(req.body);
    if (req.file) {
      body.attachmentPath = `/uploads/payroll/${req.file.filename}`;
    }
    await row.update(body);
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(EmployeeDocument, req.params.id, req);
    await row.destroy();
    res.json({ success: true, message: 'Deleted' });
  } catch (e) {
    next(e);
  }
};

exports.listExpiring = async (req, res, next) => {
  try {
    const days = req.query.days || 30;
    const rows = await listExpiringDocuments(req, { days });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
