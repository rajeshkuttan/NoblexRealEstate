const { PayrollLeaveApplication, LeaveType, Employee } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const {
  validateLeaveApplication,
  adjustBalanceOnApprove,
  restoreBalanceOnCancel,
  daysBetween,
} = require('../services/payroll/payrollLeaveBalanceService');
const { assertPeriodNotLockedForRange } = require('../services/payroll/payrollAttendancePeriodGuard');
const { AttendancePeriodLockedError, LOCKED_MESSAGE } = require('../services/payroll/payrollAttendancePeriodGuard');

function handleLockError(e, res, next) {
  if (e instanceof AttendancePeriodLockedError) {
    return res.status(403).json({ message: LOCKED_MESSAGE });
  }
  next(e);
}

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.status) where.status = req.query.status;
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    const rows = await PayrollLeaveApplication.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] },
        { model: LeaveType, as: 'leaveType' },
      ],
      order: [['fromDate', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const employee = await assertEmployeeInCompany(body.employee_id, req);
    const leaveType = await assertRecordInCompany(LeaveType, body.leave_type_id, req);
    const totalDays = await validateLeaveApplication({
      companyId: req.companyId,
      employee,
      leaveType,
      body,
    });
    const row = await PayrollLeaveApplication.create(
      withCompanyId(req, {
        employeeId: body.employee_id,
        leaveTypeId: body.leave_type_id,
        fromDate: body.from_date,
        toDate: body.to_date,
        totalDays,
        halfDay: !!body.half_day,
        reason: body.reason,
        status: 'DRAFT',
        createdBy: req.user?.id,
      })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.submit = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollLeaveApplication, req.params.id, req);
    if (row.status !== 'DRAFT') {
      return res.status(400).json({ message: 'Only draft leave can be submitted' });
    }
    await row.update({ status: 'SUBMITTED' });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.LEAVE_APPLICATION_SUBMITTED,
      entityId: req.companyId,
      metadata: { application_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollLeaveApplication, req.params.id, req, {
      include: [{ model: LeaveType, as: 'leaveType' }],
    });
    if (row.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only submitted leave can be approved' });
    }
    try {
      await assertPeriodNotLockedForRange(req.companyId, row.fromDate, row.toDate);
    } catch (e) {
      return handleLockError(e, res, next);
    }
    const employee = await assertEmployeeInCompany(row.employeeId, req);
    await validateLeaveApplication({
      companyId: req.companyId,
      employee,
      leaveType: row.leaveType,
      body: { from_date: row.fromDate, to_date: row.toDate, total_days: row.totalDays, half_day: row.halfDay },
      excludeId: row.id,
    });
    await row.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    });
    await adjustBalanceOnApprove(row);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.LEAVE_APPLICATION_APPROVED,
      entityId: req.companyId,
      metadata: { application_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    handleLockError(e, res, next);
  }
};

exports.reject = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollLeaveApplication, req.params.id, req);
    if (row.status !== 'SUBMITTED') {
      return res.status(400).json({ message: 'Only submitted leave can be rejected' });
    }
    await row.update({
      status: 'REJECTED',
      rejectedBy: req.user?.id,
      rejectedAt: new Date(),
      rejectionReason: req.body.rejection_reason || null,
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.LEAVE_APPLICATION_REJECTED,
      entityId: req.companyId,
      metadata: { application_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollLeaveApplication, req.params.id, req);
    if (!['DRAFT', 'SUBMITTED', 'APPROVED'].includes(row.status)) {
      return res.status(400).json({ message: 'Cannot cancel this leave application' });
    }
    if (row.status === 'APPROVED') {
      try {
        await assertPeriodNotLockedForRange(req.companyId, row.fromDate, row.toDate);
      } catch (e) {
        return handleLockError(e, res, next);
      }
      await restoreBalanceOnCancel(row);
    }
    await row.update({
      status: 'CANCELLED',
      cancelledBy: req.user?.id,
      cancelledAt: new Date(),
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.LEAVE_APPLICATION_CANCELLED,
      entityId: req.companyId,
      metadata: { application_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    handleLockError(e, res, next);
  }
};
