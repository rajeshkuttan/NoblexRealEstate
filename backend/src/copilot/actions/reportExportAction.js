'use strict';

const { createPendingAction, consumePendingAction } = require('./pendingActionStore');
const { hasPermission } = require('../tools/executor');
const { exportToolXlsx, exportAnswerPdf } = require('./exportService');

const ACTION_NAME = 'generateReportExport';
const REQUIRED_PERMISSION = 'module:copilot:export';

function detectExportIntent(query) {
  const q = String(query || '').toLowerCase();
  const wantsExport =
    /\b(export|download|generate report|excel|xlsx|spreadsheet|pdf report|save (as |to )?pdf)\b/.test(
      q
    );
  if (!wantsExport) return null;

  let format = 'xlsx';
  if (/\bpdf\b/.test(q) && !/\bexcel|xlsx|spreadsheet\b/.test(q)) format = 'pdf';
  else if (/\bexcel|xlsx|spreadsheet\b/.test(q)) format = 'xlsx';
  else if (/\bpdf\b/.test(q)) format = 'pdf';

  return {
    format,
    title: format === 'pdf' ? 'Copilot answer PDF' : 'ERP data Excel export',
  };
}

function proposeGenerateReportExport(ctx) {
  const detected = detectExportIntent(ctx.query);
  if (!detected) return null;

  if (!hasPermission(ctx.userPermissions, REQUIRED_PERMISSION)) {
    return {
      status: 'denied',
      action: ACTION_NAME,
      errorCode: 'PERMISSION_DENIED',
      summary: `Missing permission ${REQUIRED_PERMISSION}`,
    };
  }

  const pending = createPendingAction({
    action: ACTION_NAME,
    companyId: ctx.companyId,
    userId: ctx.userId,
    conversationId: ctx.conversationId,
    messageId: ctx.messageId || null,
    requiredPermission: REQUIRED_PERMISSION,
    payload: {
      format: detected.format,
      conversationId: ctx.conversationId,
    },
  });

  return {
    status: 'pending_confirmation',
    action: ACTION_NAME,
    confirmationToken: pending.token,
    expiresAt: new Date(pending.expiresAt).toISOString(),
    preview: {
      title: detected.title,
      category: detected.format,
      priority: 'n/a',
      bodyPreview: `Generate ${detected.format.toUpperCase()} from the latest assistant answer / tool data in this conversation.`,
    },
    summary: `Confirm to generate ${detected.format.toUpperCase()} export.`,
  };
}

async function confirmGenerateReportExport(ctx) {
  const pending = consumePendingAction(ctx.token);
  if (!pending || pending.action !== ACTION_NAME) {
    return {
      status: 'failed',
      errorCode: 'INVALID_OR_EXPIRED_TOKEN',
      summary: 'Confirmation token invalid or expired.',
    };
  }
  if (
    pending.companyId !== ctx.companyId ||
    pending.userId !== ctx.userId
  ) {
    return { status: 'failed', errorCode: 'FORBIDDEN', summary: 'Token mismatch.' };
  }
  if (!hasPermission(ctx.userPermissions, REQUIRED_PERMISSION)) {
    return {
      status: 'denied',
      errorCode: 'PERMISSION_DENIED',
      summary: `Missing permission ${REQUIRED_PERMISSION}`,
    };
  }

  const { CopilotMessage } = require('../../models');
  const lastAssistant = await CopilotMessage.findOne({
    where: {
      companyId: ctx.companyId,
      conversationId: pending.payload.conversationId || pending.conversationId,
      role: 'assistant',
    },
    order: [['id', 'DESC']],
  });
  if (!lastAssistant) {
    return {
      status: 'failed',
      errorCode: 'NO_MESSAGE',
      summary: 'No assistant message to export yet.',
    };
  }

  const format = pending.payload.format || 'xlsx';
  let file;
  if (format === 'pdf') {
    file = await exportAnswerPdf({
      companyId: ctx.companyId,
      userId: ctx.userId,
      userName: ctx.userName,
      conversationId: lastAssistant.conversationId,
      messageId: lastAssistant.id,
    });
  } else {
    try {
      file = await exportToolXlsx({
        companyId: ctx.companyId,
        userId: ctx.userId,
        conversationId: lastAssistant.conversationId,
        messageId: lastAssistant.id,
      });
    } catch (err) {
      // Fall back to PDF if no table
      file = await exportAnswerPdf({
        companyId: ctx.companyId,
        userId: ctx.userId,
        userName: ctx.userName,
        conversationId: lastAssistant.conversationId,
        messageId: lastAssistant.id,
      });
    }
  }

  return {
    status: 'success',
    action: ACTION_NAME,
    summary: `Export ready: ${file.fileName}`,
    data: {
      fileName: file.fileName,
      mimeType: file.mimeType,
      messageId: lastAssistant.id,
      conversationId: lastAssistant.conversationId,
      format: file.mimeType.includes('pdf') ? 'pdf' : 'xlsx',
    },
  };
}

module.exports = {
  proposeGenerateReportExport,
  confirmGenerateReportExport,
  detectExportIntent,
  ACTION_NAME,
  REQUIRED_PERMISSION,
};
