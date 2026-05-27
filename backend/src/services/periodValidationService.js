const { Op } = require('sequelize');
const { CompanyFinancialPeriod } = require('../models');

const CLOSED_MSG = 'Financial period is closed';

function isAdminUser(req) {
  if (!req?.user) return false;
  if (req.user.role === 'admin') return true;
  if (Array.isArray(req.userRoles) && req.userRoles.includes('admin')) return true;
  return false;
}

/**
 * @param {number} companyId
 * @param {string|Date} date
 * @param {{ req?: object, allowSoftCloseAdmin?: boolean }} [opts]
 */
async function isPeriodOpen(companyId, date, opts = {}) {
  if (!companyId || !date) return true;

  const dateStr = typeof date === 'string' ? date.slice(0, 10) : date.toISOString().slice(0, 10);
  const period = await CompanyFinancialPeriod.findOne({
    where: {
      companyId,
      startDate: { [Op.lte]: dateStr },
      endDate: { [Op.gte]: dateStr },
    },
    order: [['id', 'DESC']],
  });

  if (!period) return true;
  if (period.status === 'OPEN') return true;
  if (period.status === 'SOFT_CLOSED') {
    if (opts.allowSoftCloseAdmin !== false && opts.req && isAdminUser(opts.req)) return true;
    return false;
  }
  return false;
}

function periodClosedError() {
  const err = new Error(CLOSED_MSG);
  err.statusCode = 400;
  return err;
}

async function validatePostingDate(req, date) {
  const open = await isPeriodOpen(req.companyId, date, { req, allowSoftCloseAdmin: true });
  if (!open) throw periodClosedError();
}

async function validateDocumentDate(req, date) {
  return validatePostingDate(req, date);
}

async function getCurrentPeriodStatus(req, date) {
  const dateStr = date
    ? typeof date === 'string'
      ? date.slice(0, 10)
      : date.toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  const period = await CompanyFinancialPeriod.findOne({
    where: {
      companyId: req.companyId,
      startDate: { [Op.lte]: dateStr },
      endDate: { [Op.gte]: dateStr },
    },
    order: [['id', 'DESC']],
  });

  return {
    date: dateStr,
    status: period?.status || 'OPEN',
    periodId: period?.id || null,
    canPost: period
      ? period.status === 'OPEN' || (period.status === 'SOFT_CLOSED' && isAdminUser(req))
      : true,
  };
}

module.exports = {
  CLOSED_MSG,
  isPeriodOpen,
  validatePostingDate,
  validateDocumentDate,
  getCurrentPeriodStatus,
  isAdminUser,
};
