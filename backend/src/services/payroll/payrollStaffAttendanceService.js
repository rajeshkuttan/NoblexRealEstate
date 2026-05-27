const { Op } = require('sequelize');
const {
  Employee,
  WorkforceGroup,
  WorkCalendar,
  HolidayCalendar,
  HolidayCalendarDate,
  PayrollLeaveApplication,
  LeaveType,
} = require('../../models');
const { upsertDailySummary } = require('./payrollDailySummaryService');

const STAFF_GROUP_CODES = ['STAFF', 'MANAGEMENT', 'ADMIN', 'MGMT'];

function parseWorkDays(workDaysStr) {
  if (!workDaysStr) return [1, 2, 3, 4, 5];
  const map = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  return workDaysStr
    .split(',')
    .map((s) => map[s.trim().toLowerCase().slice(0, 3)])
    .filter((n) => n !== undefined);
}

function eachDate(fromDate, toDate) {
  const dates = [];
  const d = new Date(fromDate);
  const end = new Date(toDate);
  while (d <= end) {
    dates.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return dates;
}

async function getDefaultWorkCalendar(companyId) {
  return WorkCalendar.findOne({
    where: { companyId, status: 'active' },
    order: [['id', 'ASC']],
  });
}

async function getHolidayDates(companyId, fromDate, toDate) {
  const year = new Date(fromDate).getFullYear();
  const cal = await HolidayCalendar.findOne({
    where: { companyId, status: 'active', [Op.or]: [{ year }, { year: null }] },
    order: [['id', 'ASC']],
  });
  if (!cal) return new Set();
  const rows = await HolidayCalendarDate.findAll({
    where: {
      companyId,
      holidayCalendarId: cal.id,
      holidayDate: { [Op.between]: [fromDate, toDate] },
    },
  });
  return new Set(rows.map((r) => r.holidayDate));
}

async function getApprovedLeaveByDate(companyId, employeeId, fromDate, toDate) {
  const apps = await PayrollLeaveApplication.findAll({
    where: {
      companyId,
      employeeId,
      status: 'APPROVED',
      fromDate: { [Op.lte]: toDate },
      toDate: { [Op.gte]: fromDate },
    },
    include: [{ model: LeaveType, as: 'leaveType' }],
  });
  const map = new Map();
  for (const app of apps) {
    for (const d of eachDate(app.fromDate, app.toDate)) {
      if (d >= fromDate && d <= toDate) {
        map.set(d, app);
      }
    }
  }
  return map;
}

async function isStaffEmployee(employee) {
  if (!employee.workforceGroupId) return false;
  const wg = await WorkforceGroup.findByPk(employee.workforceGroupId);
  if (!wg) return false;
  const code = (wg.groupCode || wg.groupName || '').toUpperCase();
  return STAFF_GROUP_CODES.some((c) => code.includes(c));
}

async function generateStaffAttendance(companyId, fromDate, toDate, employeeIds = []) {
  const where = { companyId, status: 'active' };
  if (employeeIds?.length) where.id = { [Op.in]: employeeIds };

  const employees = await Employee.findAll({ where });
  const workCal = await getDefaultWorkCalendar(companyId);
  const workDayNums = parseWorkDays(workCal?.workDays);
  const holidays = await getHolidayDates(companyId, fromDate, toDate);
  const results = [];

  for (const emp of employees) {
    if (!(await isStaffEmployee(emp))) continue;
    const leaveMap = await getApprovedLeaveByDate(companyId, emp.id, fromDate, toDate);

    for (const dateStr of eachDate(fromDate, toDate)) {
      if (emp.joiningDate && dateStr < emp.joiningDate) continue;

      const leaveApp = leaveMap.get(dateStr);
      let status = 'PRESENT';
      let absenceType = null;

      if (leaveApp) {
        const lt = leaveApp.leaveType;
        if (lt && lt.isPaid) {
          status = 'ON_LEAVE';
          absenceType = 'PAID_LEAVE';
        } else {
          status = 'UNPAID_LEAVE';
          absenceType = 'UNPAID_LEAVE';
        }
      } else if (holidays.has(dateStr)) {
        status = 'HOLIDAY';
      } else {
        const dow = new Date(dateStr).getUTCDay();
        if (!workDayNums.includes(dow)) {
          status = 'WEEK_OFF';
        }
      }

      const row = await upsertDailySummary(companyId, emp.id, dateStr, {
        workCalendarId: workCal?.id || null,
        attendanceStatus: status,
        absenceType,
        source: 'STAFF_AUTO',
        scheduledHours: status === 'PRESENT' || status === 'HALF_DAY' ? 8 : 0,
        actualHours: status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0,
      });
      results.push(row);
    }
  }
  return results;
}

module.exports = {
  generateStaffAttendance,
  isStaffEmployee,
  STAFF_GROUP_CODES,
  parseWorkDays,
};
