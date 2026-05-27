const { PayrollRun, PayrollPeriod } = require('../../models');

const LOCKED_RUN_MESSAGE = 'Payroll run is locked or approved';
const LOCKED_PERIOD_MESSAGE = 'Payroll period is locked';

class PayrollRunLockedError extends Error {
  constructor(msg = LOCKED_RUN_MESSAGE) {
    super(msg);
    this.statusCode = 403;
    this.name = 'PayrollRunLockedError';
  }
}

async function assertRunMutable(run) {
  if (['LOCKED', 'APPROVED', 'REVERSED'].includes(run.status)) {
    throw new PayrollRunLockedError();
  }
}

async function assertRunNotLocked(runId, companyId) {
  const run = await PayrollRun.findOne({ where: { id: runId, companyId } });
  if (!run) {
    const err = new Error('Payroll run not found');
    err.statusCode = 404;
    throw err;
  }
  await assertRunMutable(run);
  return run;
}

async function assertPayrollPeriodOpen(periodId, companyId) {
  const period = await PayrollPeriod.findOne({ where: { id: periodId, companyId } });
  if (!period) {
    const err = new Error('Payroll period not found');
    err.statusCode = 404;
    throw err;
  }
  if (period.status === 'LOCKED') {
    throw new PayrollRunLockedError(LOCKED_PERIOD_MESSAGE);
  }
  return period;
}

module.exports = {
  LOCKED_RUN_MESSAGE,
  LOCKED_PERIOD_MESSAGE,
  PayrollRunLockedError,
  assertRunMutable,
  assertRunNotLocked,
  assertPayrollPeriodOpen,
};
