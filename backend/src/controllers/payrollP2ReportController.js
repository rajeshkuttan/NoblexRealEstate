const { getMonthlySummary } = require('../services/payroll/payrollMonthlySummaryService');
const {
  PayrollLeaveOpeningBalance,
  PayrollLeaveApplication,
  PayrollOvertimeRequest,
  PayrollLabourTimesheet,
  PayrollLabourTimesheetLine,
  PayrollAttendanceDailySummary,
  Employee,
  LeaveType,
} = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { Op } = require('sequelize');
const { monthBounds } = require('../services/payroll/payrollMonthlySummaryService');

exports.monthlyAttendance = async (req, res, next) => {
  try {
    const data = await getMonthlySummary(req.companyId, req.query);
    res.json({ success: true, report: 'monthly_attendance_summary', data });
  } catch (e) {
    next(e);
  }
};

exports.labourTimesheet = async (req, res, next) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const rows = await PayrollLabourTimesheet.findAll({
      where: { ...companyWhere(req), timesheetMonth: month, timesheetYear: year },
      include: [{ model: PayrollLabourTimesheetLine, as: 'lines' }],
    });
    res.json({ success: true, report: 'monthly_labour_timesheet', data: rows });
  } catch (e) {
    next(e);
  }
};

exports.leaveBalance = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req), status: 'APPROVED' };
    if (req.query.balance_year) where.balanceYear = req.query.balance_year;
    const rows = await PayrollLeaveOpeningBalance.findAll({
      where,
      include: [
        { model: Employee, as: 'employee' },
        { model: LeaveType, as: 'leaveType' },
      ],
    });
    res.json({ success: true, report: 'leave_balance', data: rows });
  } catch (e) {
    next(e);
  }
};

exports.leaveTransaction = async (req, res, next) => {
  try {
    const rows = await PayrollLeaveApplication.findAll({
      where: { ...companyWhere(req), status: { [Op.in]: ['APPROVED', 'CANCELLED', 'REJECTED'] } },
      include: [
        { model: Employee, as: 'employee' },
        { model: LeaveType, as: 'leaveType' },
      ],
      order: [['fromDate', 'DESC']],
      limit: 500,
    });
    res.json({ success: true, report: 'leave_transaction', data: rows });
  } catch (e) {
    next(e);
  }
};

exports.overtimeApproval = async (req, res, next) => {
  try {
    const rows = await PayrollOvertimeRequest.findAll({
      where: { ...companyWhere(req), status: 'APPROVED' },
      include: [{ model: Employee, as: 'employee' }],
      order: [['workDate', 'DESC']],
    });
    res.json({ success: true, report: 'overtime_approval', data: rows });
  } catch (e) {
    next(e);
  }
};

exports.attendanceException = async (req, res, next) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    const { fromDate, toDate } = monthBounds(year, month);
    const rows = await PayrollAttendanceDailySummary.findAll({
      where: {
        ...companyWhere(req),
        attendanceDate: { [Op.between]: [fromDate, toDate] },
        attendanceStatus: { [Op.in]: ['ABSENT', 'MISSING_PUNCH', 'UNPAID_LEAVE'] },
      },
      include: [{ model: Employee, as: 'employee' }],
    });
    res.json({ success: true, report: 'attendance_exception', data: rows });
  } catch (e) {
    next(e);
  }
};

exports.operationsDashboard = async (req, res, next) => {
  try {
    const { getPayrollReadiness } = require('../services/payroll/payrollReadinessService');
    const month = req.query.month || new Date().getMonth() + 1;
    const year = req.query.year || new Date().getFullYear();
    const readiness = await getPayrollReadiness(req.companyId, month, year);
    res.json({ success: true, data: readiness });
  } catch (e) {
    next(e);
  }
};
