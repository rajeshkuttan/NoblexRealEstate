const { Op } = require('sequelize');
const {
  PayrollLeaveOpeningBalance,
  PayrollLeaveApplication,
  LeaveType,
  Employee,
} = require('../../models');

function daysBetween(fromDate, toDate, halfDay) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  const diff = Math.floor((end - start) / (86400000)) + 1;
  if (halfDay && diff === 1) return 0.5;
  return diff;
}

function datesOverlap(aFrom, aTo, bFrom, bTo) {
  return aFrom <= bTo && bFrom <= aTo;
}

async function getApprovedBalance(companyId, employeeId, leaveTypeId, year) {
  return PayrollLeaveOpeningBalance.findOne({
    where: {
      companyId,
      employeeId,
      leaveTypeId,
      balanceYear: year,
      status: 'APPROVED',
    },
  });
}

async function assertNoLeaveOverlap(companyId, employeeId, fromDate, toDate, excludeId) {
  const where = {
    companyId,
    employeeId,
    status: { [Op.in]: ['SUBMITTED', 'APPROVED'] },
    [Op.and]: [
      { fromDate: { [Op.lte]: toDate } },
      { toDate: { [Op.gte]: fromDate } },
    ],
  };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const existing = await PayrollLeaveApplication.findOne({ where });
  if (existing) {
    const err = new Error('Leave application overlaps with existing submitted or approved leave');
    err.statusCode = 400;
    throw err;
  }
}

async function validateLeaveApplication({ companyId, employee, leaveType, body, excludeId }) {
  if (employee.status !== 'active') {
    const err = new Error('Cannot apply leave for inactive employee');
    err.statusCode = 400;
    throw err;
  }
  if (employee.joiningDate && body.from_date < employee.joiningDate) {
    const err = new Error('Cannot apply leave before joining date');
    err.statusCode = 400;
    throw err;
  }
  await assertNoLeaveOverlap(companyId, employee.id, body.from_date, body.to_date, excludeId);

  const year = new Date(body.from_date).getFullYear();
  const totalDays = body.total_days != null ? Number(body.total_days) : daysBetween(body.from_date, body.to_date, body.half_day);

  if (leaveType.isPaid && !leaveType.allowNegativeBalance) {
    const bal = await getApprovedBalance(companyId, employee.id, leaveType.id, year);
    if (!bal) {
      const err = new Error('No approved opening balance for this leave type');
      err.statusCode = 400;
      throw err;
    }
    if (Number(bal.availableDays) < totalDays) {
      const err = new Error('Insufficient leave balance');
      err.statusCode = 400;
      throw err;
    }
  }
  return totalDays;
}

async function adjustBalanceOnApprove(application) {
  const leaveType = await LeaveType.findByPk(application.leaveTypeId);
  if (!leaveType?.isPaid) return;
  const year = new Date(application.fromDate).getFullYear();
  const bal = await getApprovedBalance(
    application.companyId,
    application.employeeId,
    application.leaveTypeId,
    year
  );
  if (!bal) return;
  const days = Number(application.totalDays);
  const used = Number(bal.usedDays) + days;
  const available = Number(bal.openingDays) + Number(bal.adjustedDays) - used;
  await bal.update({ usedDays: used, availableDays: available });
}

async function restoreBalanceOnCancel(application) {
  if (application.status !== 'APPROVED') return;
  const leaveType = await LeaveType.findByPk(application.leaveTypeId);
  if (!leaveType?.isPaid) return;
  const year = new Date(application.fromDate).getFullYear();
  const bal = await getApprovedBalance(
    application.companyId,
    application.employeeId,
    application.leaveTypeId,
    year
  );
  if (!bal) return;
  const days = Number(application.totalDays);
  const used = Math.max(0, Number(bal.usedDays) - days);
  const available = Number(bal.openingDays) + Number(bal.adjustedDays) - used;
  await bal.update({ usedDays: used, availableDays: available });
}

async function approveOpeningBalance(record, userId) {
  if (record.status === 'LOCKED') {
    const err = new Error('Opening balance is locked');
    err.statusCode = 400;
    throw err;
  }
  const available =
    Number(record.openingDays) + Number(record.adjustedDays) - Number(record.usedDays);
  await record.update({
    status: 'APPROVED',
    approvedBy: userId,
    approvedAt: new Date(),
    availableDays: available,
  });
  return record;
}

module.exports = {
  daysBetween,
  datesOverlap,
  getApprovedBalance,
  assertNoLeaveOverlap,
  validateLeaveApplication,
  adjustBalanceOnApprove,
  restoreBalanceOnCancel,
  approveOpeningBalance,
};
