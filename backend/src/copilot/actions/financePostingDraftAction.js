'use strict';

/**
 * Approval-gated finance draft action (does not post to GL).
 * Creates a confirmable preview for a collection/JV draft request.
 */
const { createPendingAction } = require('./pendingActionStore');
const { getCopilotConfig } = require('../config/copilotConfig');
const { hasPermission } = require('../tools/executor');
const { CopilotToolRun } = require('../../models');

function detectFinanceDraftIntent(query) {
  const q = String(query || '').toLowerCase();
  return /\b(prepare|draft|request)\b.*\b(journal|jv|finance post|gl post|posting)\b/.test(q) ||
    /\b(approve|approval).*\b(finance|journal|posting)\b/.test(q) ||
    /\bdraft journal voucher\b/.test(q);
}

function proposePrepareFinancePostingDraft({
  companyId,
  userId,
  userPermissions,
  conversationId,
  messageId,
  query,
}) {
  if (!detectFinanceDraftIntent(query)) return null;

  if (!hasPermission(userPermissions, 'module:finance:create') &&
      !hasPermission(userPermissions, 'module:finance:approve') &&
      !hasPermission(userPermissions, 'module:finance:view')) {
    return {
      status: 'denied',
      action: 'prepareFinancePostingDraft',
      errorCode: 'PERMISSION_DENIED',
      summary: 'Missing finance permission to draft a posting.',
    };
  }

  const preview = {
    title: 'Finance posting draft (approval-gated)',
    description:
      'This prepares a draft posting request only. No journal voucher is posted until a finance approver posts in the ERP.',
    requiresApproval: true,
    glImpact: false,
    query: String(query || '').slice(0, 500),
  };

  const { token, expiresAt } = createPendingAction({
    action: 'prepareFinancePostingDraft',
    companyId,
    userId,
    conversationId,
    messageId,
    payload: preview,
    ttlMs: getCopilotConfig().actionConfirmTtlMs,
  });

  return {
    status: 'pending_confirmation',
    action: 'prepareFinancePostingDraft',
    confirmationToken: token,
    expiresAt,
    preview,
    summary: 'Confirm to record an approval-gated finance posting draft (no GL post).',
  };
}

async function confirmPrepareFinancePostingDraft({
  token,
  companyId,
  userId,
  userPermissions,
}) {
  const { consumePendingAction } = require('./pendingActionStore');
  const pending = consumePendingAction(token);
  if (!pending || pending.action !== 'prepareFinancePostingDraft') {
    return { status: 'failed', errorCode: 'INVALID_OR_EXPIRED_TOKEN', summary: 'Token invalid.' };
  }
  if (pending.companyId !== companyId || pending.userId !== userId) {
    return { status: 'denied', errorCode: 'TOKEN_OWNERSHIP', summary: 'Token mismatch.' };
  }
  if (
    !hasPermission(userPermissions, 'module:finance:create') &&
    !hasPermission(userPermissions, 'module:finance:approve') &&
    !hasPermission(userPermissions, 'module:finance:view')
  ) {
    return { status: 'denied', errorCode: 'PERMISSION_DENIED', summary: 'Missing finance permission.' };
  }

  await CopilotToolRun.create({
    companyId,
    conversationId: pending.conversationId,
    messageId: pending.messageId,
    userId,
    toolName: 'prepareFinancePostingDraft',
    module: 'finance',
    inputJson: pending.payload,
    outputSummary: 'Finance posting draft recorded; awaiting ERP approval workflow',
    outputRecordCount: 1,
    permissionCode: 'module:finance:view',
    status: 'success',
    latencyMs: 0,
  }).catch(() => {});

  return {
    status: 'success',
    action: 'prepareFinancePostingDraft',
    summary:
      'Draft recorded. No GL entries were posted. Complete approval and posting in Finance / Journal Vouchers.',
    data: { draft: pending.payload, posted: false },
  };
}

module.exports = {
  detectFinanceDraftIntent,
  proposePrepareFinancePostingDraft,
  confirmPrepareFinancePostingDraft,
};
