const { PayrollAttendanceLog, PayrollAttendanceDailySummary, Employee } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { upsertDailySummary } = require('../services/payroll/payrollDailySummaryService');
const { generateStaffAttendance } = require('../services/payroll/payrollStaffAttendanceService');
const { getMonthlySummary } = require('../services/payroll/payrollMonthlySummaryService');
const { getPayrollReadiness } = require('../services/payroll/payrollReadinessService');
const {
  assertPeriodNotLocked,
  AttendancePeriodLockedError,
  LOCKED_MESSAGE,
} = require('../services/payroll/payrollAttendancePeriodGuard');

exports.listLogs = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    if (req.query.attendance_date) where.attendanceDate = req.query.attendance_date;
    const rows = await PayrollAttendanceLog.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] }],
      order: [['attendanceDate', 'DESC']],
      limit: Math.min(Number(req.query.limit) || 200, 500),
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.createLog = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await assertEmployeeInCompany(body.employee_id, req);
    const row = await PayrollAttendanceLog.create(
      withCompanyId(req, {
        employeeId: body.employee_id,
        attendanceDate: body.attendance_date,
        checkInTime: body.check_in_time,
        checkOutTime: body.check_out_time,
        source: body.source || 'MANUAL',
        deviceId: body.device_id,
        location: body.location,
        rawPayload: body.raw_payload,
        status: body.status || 'RAW',
      })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.importLogs = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.logs) ? req.body.logs : [];
    const created = [];
    for (const item of items) {
      const body = stripCompanyFromBody(item);
      await assertEmployeeInCompany(body.employee_id, req);
      const row = await PayrollAttendanceLog.create(
        withCompanyId(req, {
          employeeId: body.employee_id,
          attendanceDate: body.attendance_date,
          checkInTime: body.check_in_time,
          checkOutTime: body.check_out_time,
          source: 'IMPORT',
          status: 'RAW',
          rawPayload: item,
        })
      );
      created.push(row);
    }
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.ATTENDANCE_LOG_IMPORTED,
      entityId: req.companyId,
      metadata: { count: created.length },
    });
    res.status(201).json({ success: true, data: created });
  } catch (e) {
    next(e);
  }
};

exports.listDailySummaries = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    if (req.query.from_date && req.query.to_date) {
      const { Op } = require('sequelize');
      where.attendanceDate = { [Op.between]: [req.query.from_date, req.query.to_date] };
    }
    const rows = await PayrollAttendanceDailySummary.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] }],
      order: [['attendanceDate', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.adjustDaily = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    try {
      await assertPeriodNotLocked(req.companyId, body.attendance_date);
    } catch (e) {
      if (e instanceof AttendancePeriodLockedError) {
        return res.status(403).json({ message: LOCKED_MESSAGE });
      }
      throw e;
    }
    await assertEmployeeInCompany(body.employee_id, req);
    const row = await upsertDailySummary(req.companyId, body.employee_id, body.attendance_date, {
      attendanceStatus: body.attendance_status,
      actualHours: body.actual_hours,
      lateMinutes: body.late_minutes,
      earlyLeaveMinutes: body.early_leave_minutes,
      overtimeHours: body.overtime_hours,
      isManualAdjustment: true,
      approvedBy: req.user?.id,
      approvedAt: new Date(),
      source: 'MANUAL_ADJUST',
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.ATTENDANCE_ADJUSTED,
      entityId: req.companyId,
      metadata: { summary_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.generateStaff = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    try {
      await assertPeriodNotLocked(req.companyId, body.from_date);
      await assertPeriodNotLocked(req.companyId, body.to_date);
    } catch (e) {
      if (e instanceof AttendancePeriodLockedError) {
        return res.status(403).json({ message: LOCKED_MESSAGE });
      }
      throw e;
    }
    const results = await generateStaffAttendance(
      req.companyId,
      body.from_date,
      body.to_date,
      body.employee_ids
    );
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.ATTENDANCE_SUMMARY_GENERATED,
      entityId: req.companyId,
      metadata: { count: results.length, source: 'STAFF_AUTO' },
    });
    res.json({ success: true, data: { generated: results.length, summaries: results } });
  } catch (e) {
    next(e);
  }
};

exports.monthlySummary = async (req, res, next) => {
  try {
    const data = await getMonthlySummary(req.companyId, req.query);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.payrollReadiness = async (req, res, next) => {
  try {
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const data = await getPayrollReadiness(req.companyId, month, year);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
