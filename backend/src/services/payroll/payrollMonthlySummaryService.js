const { Op } = require('sequelize');
const {
  Employee,
  Department,
  PayrollAttendanceDailySummary,
} = require('../../models');

function monthBounds(year, month) {
  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { fromDate, toDate, calendarDays: lastDay };
}

function countStatus(rows, statuses) {
  const set = new Set(Array.isArray(statuses) ? statuses : [statuses]);
  return rows.filter((r) => set.has(r.attendanceStatus)).length;
}

function sumField(rows, field) {
  return rows.reduce((s, r) => s + Number(r[field] || 0), 0);
}

function buildEmployeeSummary(employee, rows, calendarDays) {
  const presentDays = countStatus(rows, ['PRESENT', 'HALF_DAY']) + countStatus(rows, 'HALF_DAY') * 0;
  const halfDays = rows.filter((r) => r.attendanceStatus === 'HALF_DAY').length;
  const present = countStatus(rows, 'PRESENT') + halfDays * 0.5;
  const paidLeaveDays = countStatus(rows, 'ON_LEAVE');
  const unpaidLeaveDays = countStatus(rows, 'UNPAID_LEAVE');
  const absentDays = countStatus(rows, 'ABSENT');
  const holidayDays = countStatus(rows, 'HOLIDAY');
  const weekOffDays = countStatus(rows, 'WEEK_OFF');
  const overtimeHours = sumField(rows, 'overtimeHours');
  const lateMinutes = sumField(rows, 'lateMinutes');
  const earlyLeaveMinutes = sumField(rows, 'earlyLeaveMinutes');

  const workingDays = calendarDays - weekOffDays;
  const payableDays = present + paidLeaveDays + holidayDays;

  return {
    employee: {
      id: employee.id,
      employeeNo: employee.employeeNo,
      employeeName: employee.employeeName,
      departmentId: employee.departmentId,
      workforceGroupId: employee.workforceGroupId,
    },
    calendar_days: calendarDays,
    working_days: workingDays,
    present_days: present,
    paid_leave_days: paidLeaveDays,
    unpaid_leave_days: unpaidLeaveDays,
    absent_days: absentDays,
    holiday_days: holidayDays,
    week_off_days: weekOffDays,
    overtime_hours: overtimeHours,
    late_minutes: lateMinutes,
    early_leave_minutes: earlyLeaveMinutes,
    payable_days: payableDays,
  };
}

async function getMonthlySummary(companyId, filters) {
  const { month, year, department_id, cost_center_id, employee_id, workforce_group_id } = filters;
  const y = Number(year);
  const m = Number(month);
  const { fromDate, toDate, calendarDays } = monthBounds(y, m);

  const empWhere = { companyId, status: 'active' };
  if (employee_id) empWhere.id = employee_id;
  if (department_id) empWhere.departmentId = department_id;
  if (workforce_group_id) empWhere.workforceGroupId = workforce_group_id;

  let employees = await Employee.findAll({ where: empWhere });
  if (cost_center_id) {
    const deptIds = await Department.findAll({
      where: { companyId, costCenterId: cost_center_id },
      attributes: ['id'],
    }).then((rows) => rows.map((d) => d.id));
    employees = employees.filter((e) => e.departmentId && deptIds.includes(e.departmentId));
  }

  const summaries = [];
  for (const emp of employees) {
    const rows = await PayrollAttendanceDailySummary.findAll({
      where: {
        companyId,
        employeeId: emp.id,
        attendanceDate: { [Op.between]: [fromDate, toDate] },
      },
    });
    summaries.push(buildEmployeeSummary(emp, rows, calendarDays));
  }
  return summaries;
}

module.exports = {
  monthBounds,
  getMonthlySummary,
  buildEmployeeSummary,
};
