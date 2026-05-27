const { PayrollAttendanceDailySummary } = require('../../models');

async function upsertDailySummary(companyId, employeeId, attendanceDate, patch) {
  const [row] = await PayrollAttendanceDailySummary.findOrCreate({
    where: { companyId, employeeId, attendanceDate },
    defaults: {
      companyId,
      employeeId,
      attendanceDate,
      attendanceStatus: 'PRESENT',
      ...patch,
    },
  });
  if (row.locked) {
    const err = new Error('Daily summary is locked');
    err.statusCode = 400;
    throw err;
  }
  await row.update(patch);
  return row;
}

async function applyLabourLine(companyId, line) {
  const normal = Number(line.normalHours) || 0;
  const ot = Number(line.overtimeHours) || 0;
  const absence = Number(line.absenceHours) || 0;
  let status = 'PRESENT';
  if (absence > 0 && normal === 0) status = 'ABSENT';
  return upsertDailySummary(companyId, line.employeeId, line.workDate, {
    actualHours: normal,
    overtimeHours: ot,
    attendanceStatus: status,
    source: 'LABOUR_TIMESHEET',
  });
}

async function applyOvertimeApproval(companyId, request) {
  const row = await PayrollAttendanceDailySummary.findOne({
    where: { companyId, employeeId: request.employeeId, attendanceDate: request.workDate },
  });
  const hours = Number(request.approvedHours) || 0;
  if (row) {
    if (row.locked) {
      const err = new Error('Daily summary is locked');
      err.statusCode = 400;
      throw err;
    }
    await row.update({ overtimeHours: hours, source: 'OVERTIME' });
    return row;
  }
  return upsertDailySummary(companyId, request.employeeId, request.workDate, {
    attendanceStatus: 'PRESENT',
    overtimeHours: hours,
    source: 'OVERTIME',
  });
}

async function lockSummariesForPeriod(companyId, fromDate, toDate) {
  const { Op } = require('sequelize');
  await PayrollAttendanceDailySummary.update(
    { locked: true },
    {
      where: {
        companyId,
        attendanceDate: { [Op.between]: [fromDate, toDate] },
      },
    }
  );
}

module.exports = {
  upsertDailySummary,
  applyLabourLine,
  applyOvertimeApproval,
  lockSummariesForPeriod,
};
