'use strict';

const fs = require('fs');
const path = require('path');
const { CopilotToolRun } = require('../../models');
const { createPendingAction, consumePendingAction } = require('./pendingActionStore');
const { hasPermission } = require('../tools/executor');
const documentService = require('../ingestion/documentService');
const { tick } = require('../ingestion/indexerWorker');

const ACTION_NAME = 'prepareCollectionNotice';
const REQUIRED_PERMISSION = 'module:finance:view';

function detectCollectionNoticeIntent(query) {
  const q = String(query || '').toLowerCase();
  if (!/\b(prepare|draft|generate|write)\b/.test(q)) return null;
  if (!/\b(collection notice|overdue notice|payment reminder letter|demand letter)\b/.test(q)) {
    return null;
  }

  const tenantMatch = q.match(/tenant\s+#?(\d+)/i);
  const nameMatch = q.match(/for\s+([a-z0-9 .'-]{2,60})/i);
  const tenantLabel = tenantMatch
    ? `Tenant #${tenantMatch[1]}`
    : nameMatch
      ? nameMatch[1].trim()
      : 'the tenant';

  const body =
    `COLLECTION NOTICE\n\n` +
    `Date: ${new Date().toISOString().slice(0, 10)}\n` +
    `To: ${tenantLabel}\n\n` +
    `This is a courtesy notice regarding outstanding rent / receivable balances recorded in our system. ` +
    `Please arrange settlement of overdue amounts at your earliest convenience.\n\n` +
    `If payment has already been made, kindly disregard this notice and share the remittance reference.\n\n` +
    `Regards,\nProperty Management\n\n` +
    `---\nGenerated via Copilot from request:\n${String(query).trim().slice(0, 500)}\n`;

  return {
    title: `Collection notice — ${tenantLabel}`,
    tenantLabel,
    body,
  };
}

function proposePrepareCollectionNotice({
  companyId,
  userId,
  userPermissions,
  conversationId,
  messageId,
  query,
}) {
  const draft = detectCollectionNoticeIntent(query);
  if (!draft) return null;

  if (!hasPermission(userPermissions, REQUIRED_PERMISSION)) {
    return {
      status: 'denied',
      errorCode: 'PERMISSION_DENIED',
      summary: `Missing permission ${REQUIRED_PERMISSION}`,
    };
  }

  const pending = createPendingAction({
    action: ACTION_NAME,
    companyId,
    userId,
    conversationId,
    messageId,
    requiredPermission: REQUIRED_PERMISSION,
    payload: draft,
  });

  return {
    status: 'pending_confirmation',
    action: ACTION_NAME,
    confirmationToken: pending.token,
    expiresAt: new Date(pending.expiresAt).toISOString(),
    preview: {
      title: draft.title,
      category: 'collection_notice',
      priority: 'n/a',
      bodyPreview: draft.body.slice(0, 280),
    },
    summary: 'Confirm to save this collection notice draft into the Copilot document corpus.',
  };
}

async function confirmPrepareCollectionNotice({ token, companyId, userId, userPermissions }) {
  const started = Date.now();
  const pending = consumePendingAction(token);
  if (!pending || pending.action !== ACTION_NAME) {
    return {
      status: 'failed',
      errorCode: 'INVALID_OR_EXPIRED_TOKEN',
      summary: 'Confirmation token invalid or expired.',
    };
  }
  if (pending.companyId !== companyId || pending.userId !== userId) {
    return {
      status: 'denied',
      errorCode: 'ACTION_OWNERSHIP_MISMATCH',
      summary: 'Confirmation does not belong to this user/company.',
    };
  }
  if (!hasPermission(userPermissions, REQUIRED_PERMISSION)) {
    return {
      status: 'denied',
      errorCode: 'PERMISSION_DENIED',
      summary: `Missing permission ${REQUIRED_PERMISSION}`,
    };
  }

  const draft = pending.payload || {};
  const dir = documentService.ensureUploadDir(companyId);
  const fileName = `collection-notice-${Date.now()}.txt`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, draft.body || '', 'utf8');

  const { CopilotDocument } = require('../../models');
  const crypto = require('crypto');
  const checksum = crypto.createHash('sha256').update(draft.body || '').digest('hex');
  const fileSize = Buffer.byteLength(draft.body || '', 'utf8');

  const document = await CopilotDocument.create({
    companyId,
    module: 'finance',
    documentType: 'collection_notice',
    title: draft.title || 'Collection notice',
    fileName,
    filePath,
    mimeType: 'text/plain',
    fileSize,
    checksum,
    ingestionStatus: 'pending',
    extractionStatus: 'pending',
    indexingStatus: 'pending',
    sourceSystem: 'copilot_action',
    uploadedBy: userId,
  });

  void tick();

  await CopilotToolRun.create({
    companyId,
    conversationId: pending.conversationId,
    messageId: pending.messageId,
    userId,
    toolName: ACTION_NAME,
    module: 'finance',
    inputJson: { title: draft.title, tenantLabel: draft.tenantLabel },
    outputSummary: JSON.stringify({ documentId: document.id, title: document.title }).slice(0, 1500),
    outputRecordCount: 1,
    permissionCode: REQUIRED_PERMISSION,
    status: 'success',
    latencyMs: Date.now() - started,
  }).catch(() => {});

  return {
    status: 'success',
    action: ACTION_NAME,
    data: {
      documentId: document.id,
      title: document.title,
      fileName: document.fileName,
    },
    summary: `Saved collection notice draft as document #${document.id}`,
  };
}

module.exports = {
  ACTION_NAME,
  REQUIRED_PERMISSION,
  detectCollectionNoticeIntent,
  proposePrepareCollectionNotice,
  confirmPrepareCollectionNotice,
};
