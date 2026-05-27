const { companyWhere } = require('../utils/companyScope');
const {
  logCompanyEvent,
  COMPANY_AUDIT_ACTIONS,
} = require('./companyAuditService');

const POSTING_BLOCKED_MSG =
  'Posting blocked because the source document does not belong to the active company.';

function postingBlockedError(req, metadata = {}) {
  if (req && !req._postingAuditLogged) {
    req._postingAuditLogged = true;
    logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.CROSS_COMPANY_FINANCE_POSTING_BLOCKED,
      entityId: req.companyId || 0,
      metadata: {
        reason: POSTING_BLOCKED_MSG,
        ...metadata,
      },
    });
  }
  const err = new Error(POSTING_BLOCKED_MSG);
  err.statusCode = 400;
  return err;
}

function resolvePostingCompanyId(req, sourceRecord) {
  if (!req?.companyId) {
    const err = new Error('Company context missing');
    err.statusCode = 400;
    throw err;
  }
  if (sourceRecord?.companyId != null && Number(sourceRecord.companyId) !== Number(req.companyId)) {
    throw postingBlockedError(req, {
      source_company_id: sourceRecord.companyId,
      active_company_id: req.companyId,
    });
  }
  return req.companyId;
}

function assertPostingCompany(reqCompanyId, sourceCompanyId, req, metadata = {}) {
  if (reqCompanyId == null) {
    const err = new Error('Company context missing');
    err.statusCode = 400;
    throw err;
  }
  if (sourceCompanyId != null && Number(sourceCompanyId) !== Number(reqCompanyId)) {
    throw postingBlockedError(req, {
      source_company_id: sourceCompanyId,
      active_company_id: reqCompanyId,
      ...metadata,
    });
  }
}

function buildPostingContext({ req, sourceType, sourceId, sourceRecord }) {
  const companyId = resolvePostingCompanyId(req, sourceRecord);
  return {
    companyId,
    sourceType,
    sourceId: sourceId ?? sourceRecord?.id,
    postedBy: req?.user?.id,
    req,
  };
}

async function loadPostingSource(Model, id, req, options = {}) {
  const record = await Model.findOne({
    where: { id, ...companyWhere(req) },
    ...options,
  });
  if (!record) {
    const err = new Error('Record not found');
    err.statusCode = 404;
    throw err;
  }
  return record;
}

async function logFinancePostingEvent({ req, action, companyId, metadata = {} }) {
  await logCompanyEvent({
    req,
    action,
    entityId: companyId ?? req?.companyId ?? 0,
    metadata: {
      module: 'finance_posting',
      company_id: companyId ?? req?.companyId,
      ...metadata,
    },
  });
}

module.exports = {
  POSTING_BLOCKED_MSG,
  postingBlockedError,
  resolvePostingCompanyId,
  assertPostingCompany,
  buildPostingContext,
  loadPostingSource,
  logFinancePostingEvent,
};
