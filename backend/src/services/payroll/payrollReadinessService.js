const { Op } = require('sequelize');
const {
  Employee,
  PayrollLeaveApplication,
  PayrollOvertimeRequest,
  PayrollLabourTimesheet,
  PayrollAttendancePeriod,
  PayrollAttendanceDailySummary,
} = require('../../models');
const { monthBounds } = require('./payrollMonthlySummaryService');
const { isPeriodLocked } = require('./payrollAttendancePeriodGuard');

async function getPayrollReadiness(companyId, month, year) {
  const y = Number(year);
  const m = Number(month);
  const { fromDate, toDate } = monthBounds(y, m);

  const period = await PayrollAttendancePeriod.findOne({
    where: { companyId, periodMonth: m, periodYear: y },
  });

  const employees = await Employee.findAll({ where: { companyId, status: 'active' } });
  const totalEmployees = employees.length;

  const pendingLeave = await PayrollLeaveApplication.count({
    where: { companyId, status: 'SUBMITTED' },
  });

  const pendingOvertime = await PayrollOvertimeRequest.count({
    where: { companyId, status: 'SUBMITTED' },
  });

  const unapprovedTimesheets = await PayrollLabourTimesheet.count({
    where: {
      companyId,
      timesheetMonth: m,
      timesheetYear: y,
      status: { [Op.in]: ['DRAFT', 'SUBMITTED'] },
    },
  });

  let missingAttendance = 0;
  for (const emp of employees) {
    const count = await PayrollAttendanceDailySummary.count({
      where: {
        companyId,
        employeeId: emp.id,
        attendanceDate: { [Op.between]: [fromDate, toDate] },
      },
    });
    const expected = Math.ceil((new Date(toDate) - new Date(fromDate)) / 86400000) + 1;
    if (count < expected) missingAttendance += 1;
  }

  const lockedStatus = period?.status === 'LOCKED';
  const periodApproved = period && ['APPROVED', 'LOCKED'].includes(period.status);

  const blocking_issues = [];
  if (pendingLeave > 0) blocking_issues.push(`${pendingLeave} pending leave approval(s)`);
  if (pendingOvertime > 0) blocking_issues.push(`${pendingOvertime} pending overtime approval(s)`);
  if (unapprovedTimesheets > 0) blocking_issues.push(`${unapprovedTimesheets} unapproved labour timesheet(s)`);
  if (missingAttendance > 0) blocking_issues.push(`${missingAttendance} employee(s) with incomplete attendance`);
  if (!period) blocking_issues.push('Attendance period not generated');
  else if (!periodApproved) blocking_issues.push(`Attendance period status is ${period.status}`);

  const ready_for_payroll =
    blocking_issues.length === 0 && periodApproved && (period?.status === 'APPROVED' || period?.status === 'LOCKED');

  const monthlyReady = totalEmployees - missingAttendance;

  return {
    period: period
      ? { id: period.id, month: m, year: y, status: period.status, from_date: period.fromDate, to_date: period.toDate }
      : { month: m, year: y, status: 'OPEN' },
    total_employees: totalEmployees,
    missing_attendance: missingAttendance,
    pending_leave_approvals: pendingLeave,
    pending_overtime_approvals: pendingOvertime,
    unapproved_timesheets: unapprovedTimesheets,
    locked_status: lockedStatus,
    ready_for_payroll,
    employees_ready_for_payroll: monthlyReady,
    blocking_issues,
  };
}

module.exports = { getPayrollReadiness };
