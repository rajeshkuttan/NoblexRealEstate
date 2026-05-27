const { EmployeeSeparation, Employee } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    if (req.query.status) where.status = req.query.status;
    const rows = await EmployeeSeparation.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(EmployeeSeparation, req.params.id, req, {
      include: [{ model: Employee, as: 'employee' }],
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await assertEmployeeInCompany(body.employee_id, req);
    const row = await EmployeeSeparation.create(
      withCompanyId(req, {
        employeeId: body.employee_id,
        separationType: body.separation_type,
        lastWorkingDay: body.last_working_day,
        noticeDays: body.notice_days ?? 0,
        servedNoticeDays: body.served_notice_days ?? 0,
        reason: body.reason,
        status: 'DRAFT',
        createdBy: req.user?.id,
      })
    );
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.EMPLOYEE_SEPARATION_CREATED,
      entityId: req.companyId,
      metadata: { separation_id: row.id, employee_id: row.employeeId },
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const row = await assertRecordInCompany(EmployeeSeparation, req.params.id, req);
    if (row.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only DRAFT separations can be updated' });
    }
    await row.update({
      separationType: body.separation_type ?? row.separationType,
      lastWorkingDay: body.last_working_day ?? row.lastWorkingDay,
      noticeDays: body.notice_days ?? row.noticeDays,
      servedNoticeDays: body.served_notice_days ?? row.servedNoticeDays,
      reason: body.reason ?? row.reason,
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.submit = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(EmployeeSeparation, req.params.id, req);
    if (row.status !== 'DRAFT') return res.status(400).json({ message: 'Only DRAFT can be submitted' });
    await row.update({ status: 'SUBMITTED' });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(EmployeeSeparation, req.params.id, req);
    if (!['DRAFT', 'SUBMITTED'].includes(row.status)) {
      return res.status(400).json({ message: 'Separation cannot be approved in current status' });
    }
    await row.update({ status: 'APPROVED', approvedBy: req.user?.id });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(EmployeeSeparation, req.params.id, req);
    if (row.status === 'CANCELLED') return res.status(400).json({ message: 'Already cancelled' });
    await row.update({ status: 'CANCELLED' });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
