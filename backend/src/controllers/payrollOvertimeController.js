const { PayrollOvertimeRequest, Employee, ShiftMaster, PayrollAttendanceDailySummary } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { applyOvertimeApproval } = require('../services/payroll/payrollDailySummaryService');
const {
  assertPeriodNotLocked,
  AttendancePeriodLockedError,
  LOCKED_MESSAGE,
} = require('../services/payroll/payrollAttendancePeriodGuard');

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.status) where.status = req.query.status;
    const rows = await PayrollOvertimeRequest.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] }],
      order: [['workDate', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await assertEmployeeInCompany(body.employee_id, req);
    const row = await PayrollOvertimeRequest.create(
      withCompanyId(req, {
        employeeId: body.employee_id,
        workDate: body.work_date,
        requestedHours: body.requested_hours,
        reason: body.reason,
        status: 'DRAFT',
        createdBy: req.user?.id,
      })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.submit = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollOvertimeRequest, req.params.id, req);
    if (row.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft overtime can be submitted' });
    }
    await row.update({ status: 'SUBMITTED' });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollOvertimeRequest, req.params.id, req);
    if (row.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only submitted overtime can be approved' });
    }
    try {
      await assertPeriodNotLocked(req.companyId, row.workDate);
    } catch (e) {
      if (e instanceof AttendancePeriodLockedError) {
        return res.status(403).json({ message: LOCKED_MESSAGE });
      }
      throw e;
    }
    const daily = await PayrollAttendanceDailySummary.findOne({
      where: { companyId: req.companyId, employeeId: row.employeeId, attendanceDate: row.workDate },
    });
    if (daily && ['ABSENT', 'MISSING_PUNCH'].includes(daily.attendanceStatus)) {
      return res.status(400).json({ message: 'Cannot approve overtime on absent day' });
    }
    const approvedHours = req.body.approved_hours != null ? req.body.approved_hours : row.requestedHours;
    await row.update({
      status: 'APPROVED',
      approvedHours,
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    });
    await applyOvertimeApproval(req.companyId, row);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.OVERTIME_APPROVED,
      entityId: req.companyId,
      metadata: { overtime_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollOvertimeRequest, req.params.id, req);
    if (row.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only submitted overtime can be rejected' });
    }
    await row.update({ status: 'REJECTED' });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};
