const { PayrollPeriod, PayrollAttendancePeriod } = require('../../models');
const { monthBounds } = require('./payrollMonthlySummaryService');

async function assertAttendanceReady(companyId, month, year) {
  const att = await PayrollAttendancePeriod.findOne({
    where: { companyId, periodMonth: month, periodYear: year },
  });
  if (!att) {
    const err = new Error('Attendance period not found for this month');
    err.statusCode = 400;
    throw err;
  }
  if (!['APPROVED', 'LOCKED'].includes(att.status)) {
    const err = new Error('Attendance period must be APPROVED or LOCKED before payroll period');
    err.statusCode = 400;
    throw err;
  }
  return att;
}

async function generatePayrollPeriod(companyId, month, year, userId) {
  const att = await assertAttendanceReady(companyId, month, year);
  const { fromDate, toDate } = monthBounds(year, month);

  let period = await PayrollPeriod.findOne({
    where: { companyId, periodMonth: month, periodYear: year },
  });

  if (period && period.status === 'LOCKED') {
    const err = new Error('Payroll period is locked');
    err.statusCode = 403;
    throw err;
  }

  if (period) {
    await period.update({
      attendancePeriodId: att.id,
      fromDate,
      toDate,
      status: 'GENERATED',
      generatedAt: new Date(),
      createdBy: userId,
    });
  } else {
    period = await PayrollPeriod.create({
      companyId,
      attendancePeriodId: att.id,
      periodMonth: month,
      periodYear: year,
      fromDate,
      toDate,
      status: 'GENERATED',
      generatedAt: new Date(),
      createdBy: userId,
    });
  }
  return period;
}

module.exports = {
  assertAttendanceReady,
  generatePayrollPeriod,
};
