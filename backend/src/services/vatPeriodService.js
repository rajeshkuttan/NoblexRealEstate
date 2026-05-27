const { Op } = require('sequelize');
const { CompanyVatPeriod } = require('../models');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('./companyAuditService');
const { isAdminUser } = require('./periodValidationService');

async function findVatPeriodForDate(companyId, transactionDate) {
  if (!companyId || !transactionDate) return null;
  const dateStr =
    typeof transactionDate === 'string'
      ? transactionDate.slice(0, 10)
      : transactionDate.toISOString().slice(0, 10);

  return CompanyVatPeriod.findOne({
    where: {
      companyId,
      startDate: { [Op.lte]: dateStr },
      endDate: { [Op.gte]: dateStr },
    },
    order: [['id', 'DESC']],
  });
}

/**
 * @param {number} companyId
 * @param {string|Date} transactionDate
 * @param {{ req?: object, allowLockedAdmin?: boolean }} [opts]
 */
async function assertVatPeriodEditable(companyId, transactionDate, opts = {}) {
  const period = await findVatPeriodForDate(companyId, transactionDate);
  if (!period) return;

  if (period.status === 'SUBMITTED') {
    const err = new Error('VAT period has been submitted and cannot be modified');
    err.statusCode = 400;
    throw err;
  }

  if (period.status === 'LOCKED') {
    const allowAdmin = opts.allowLockedAdmin !== false && opts.req && isAdminUser(opts.req);
    if (!allowAdmin) {
      const err = new Error('VAT period is locked');
      err.statusCode = 400;
      throw err;
    }
  }
}

async function submitVatPeriod(req, periodId) {
  const period = await CompanyVatPeriod.findOne({
    where: { id: periodId, companyId: req.companyId },
  });
  if (!period) {
    const err = new Error('VAT period not found');
    err.statusCode = 404;
    throw err;
  }
  if (period.status === 'SUBMITTED') return period;

  await period.update({
    status: 'SUBMITTED',
    submittedAt: new Date(),
    submittedBy: req.user?.id || null,
  });

  await logCompanyEvent({
    req,
    action: COMPANY_AUDIT_ACTIONS.VAT_PERIOD_SUBMITTED,
    entityId: req.companyId,
    metadata: { vat_period_id: period.id, period_name: period.periodName },
  });

  return period;
}

async function lockVatPeriod(req, periodId) {
  const period = await CompanyVatPeriod.findOne({
    where: { id: periodId, companyId: req.companyId },
  });
  if (!period) {
    const err = new Error('VAT period not found');
    err.statusCode = 404;
    throw err;
  }

  await period.update({ status: 'LOCKED' });

  await logCompanyEvent({
    req,
    action: COMPANY_AUDIT_ACTIONS.VAT_PERIOD_LOCKED,
    entityId: req.companyId,
    metadata: { vat_period_id: period.id, period_name: period.periodName },
  });

  return period;
}

module.exports = {
  findVatPeriodForDate,
  assertVatPeriodEditable,
  submitVatPeriod,
  lockVatPeriod,
};
