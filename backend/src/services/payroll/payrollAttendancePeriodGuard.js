const { PayrollAttendancePeriod } = require('../../models');

const LOCKED_MESSAGE = 'Attendance period is locked';

class AttendancePeriodLockedError extends Error {
  constructor() {
    super(LOCKED_MESSAGE);
    this.statusCode = 403;
    this.name = 'AttendancePeriodLockedError';
  }
}

async function getPeriodForDate(companyId, dateStr) {
  const d = new Date(dateStr);
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return PayrollAttendancePeriod.findOne({
    where: { companyId, periodMonth: month, periodYear: year },
  });
}

async function assertPeriodNotLocked(companyId, dateStr) {
  const period = await getPeriodForDate(companyId, dateStr);
  if (period && period.status === 'LOCKED') {
    throw new AttendancePeriodLockedError();
  }
  return period;
}

async function assertPeriodNotLockedForRange(companyId, fromDate, toDate) {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    await assertPeriodNotLocked(companyId, iso);
  }
}

async function isPeriodLocked(companyId, month, year) {
  const period = await PayrollAttendancePeriod.findOne({
    where: { companyId, periodMonth: month, periodYear: year },
  });
  return period?.status === 'LOCKED';
}

module.exports = {
  LOCKED_MESSAGE,
  AttendancePeriodLockedError,
  getPeriodForDate,
  assertPeriodNotLocked,
  assertPeriodNotLockedForRange,
  isPeriodLocked,
};
