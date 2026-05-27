const { AccountsTrans, FinancialTransaction } = require('../models');
const {
  assertAccountInCompany,
  validatePostingLineRefs,
} = require('../utils/companyScope');
const { logFinancePostingEvent } = require('./financePostingContext.service');
const { COMPANY_AUDIT_ACTIONS } = require('./companyAuditService');

function assertCompanyId(companyId) {
  if (companyId == null) {
    const err = new Error('Company context missing for posting');
    err.statusCode = 400;
    throw err;
  }
}

async function createCompanyAccountingEntry({
  companyId,
  lines,
  transaction,
  req,
  sourceType,
  sourceId,
  auditAction,
}) {
  assertCompanyId(companyId);
  if (!Array.isArray(lines) || lines.length === 0) {
    const err = new Error('At least one accounting line is required');
    err.statusCode = 400;
    throw err;
  }

  const created = [];
  for (const line of lines) {
    if (line.companyId != null && Number(line.companyId) !== Number(companyId)) {
      const err = new Error('Accounting line company_id does not match posting context');
      err.statusCode = 400;
      throw err;
    }
    await validatePostingLineRefs(req, line);
    const ledgerId = line.ledgerId ?? line.ledger;
    if (ledgerId != null) {
      await assertAccountInCompany(ledgerId, req);
    }

    const row = await AccountsTrans.create(
      { ...line, companyId },
      transaction ? { transaction } : undefined
    );
    created.push(row);
  }

  if (auditAction && req && created.length > 0) {
    await logFinancePostingEvent({
      req,
      action: auditAction,
      companyId,
      metadata: {
        source_type: sourceType,
        source_id: sourceId,
        line_count: created.length,
      },
    });
  }

  return created;
}

async function createCompanyFinancialTransaction({
  companyId,
  payload,
  transaction,
  req,
  sourceType,
  sourceId,
  auditAction,
}) {
  assertCompanyId(companyId);
  if (payload.companyId != null && Number(payload.companyId) !== Number(companyId)) {
    const err = new Error('Financial transaction company_id does not match posting context');
    err.statusCode = 400;
    throw err;
  }
  if (payload.accountId != null) {
    await assertAccountInCompany(payload.accountId, req);
  }

  const row = await FinancialTransaction.create(
    { ...payload, companyId },
    transaction ? { transaction } : undefined
  );

  if (auditAction && req) {
    await logFinancePostingEvent({
      req,
      action: auditAction,
      companyId,
      metadata: {
        source_type: sourceType,
        source_id: sourceId,
        financial_transaction_id: row.id,
        amount: payload.amount,
      },
    });
  }

  return row;
}

module.exports = {
  createCompanyAccountingEntry,
  createCompanyFinancialTransaction,
  COMPANY_AUDIT_ACTIONS,
  assertCompanyId,
};
