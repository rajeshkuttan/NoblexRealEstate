const { companyWhere } = require('../utils/companyScope');
const { logCompanyEvent } = require('./companyAuditService');

function validateReportCompany(companyId) {
  if (!companyId) {
    const err = new Error('Company context missing');
    err.statusCode = 400;
    throw err;
  }
  return companyId;
}

function buildReportContext(req) {
  return {
    companyId: validateReportCompany(req?.companyId),
    company: req?.company || null,
    userId: req?.user?.id || null,
  };
}

function whereCompany(req) {
  return companyWhere(req);
}

function applyCompanyFilter(query = {}, companyId) {
  validateReportCompany(companyId);
  const nextQuery = { ...query };
  nextQuery.where = { ...(query.where || {}), companyId };
  return nextQuery;
}

async function logReportEvent({ req, action, metadata = {} }) {
  if (!req?.companyId) return;
  await logCompanyEvent({
    req,
    action,
    entityId: req.companyId,
    metadata: {
      company_id: req.companyId,
      ...metadata,
    },
  });
}

module.exports = {
  buildReportContext,
  whereCompany,
  applyCompanyFilter,
  validateReportCompany,
  logReportEvent,
};
