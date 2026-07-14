'use strict';

/**
 * Copilot PDF / Excel export (server-side, audited).
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const {
  CopilotMessage,
  CopilotMessageSource,
  CopilotConversation,
  AuditLog,
} = require('../../models');
const { logCopilot } = require('../observability/copilotLogger');

function exportRoot(companyId) {
  const root = path.join(__dirname, '../../../uploads/copilot-exports', String(companyId));
  fs.mkdirSync(root, { recursive: true });
  return root;
}

async function assertMessageAccess(companyId, userId, conversationId, messageId) {
  const conversation = await CopilotConversation.findOne({
    where: { id: conversationId, companyId, userId },
  });
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  const message = await CopilotMessage.findOne({
    where: { id: messageId, companyId, conversationId, role: 'assistant' },
  });
  if (!message) {
    const err = new Error('Assistant message not found');
    err.status = 404;
    throw err;
  }
  return { conversation, message };
}

async function writeAudit(userId, companyId, action, entityId, newValue) {
  try {
    await AuditLog.create({
      entityType: 'CopilotExport',
      entityId,
      action,
      oldValue: null,
      newValue: { companyId, ...newValue },
      userId,
    });
  } catch (err) {
    logCopilot('error', 'export_audit_failed', { error: err.message });
  }
}

async function exportAnswerPdf({ companyId, userId, userName, conversationId, messageId }) {
  const { conversation, message } = await assertMessageAccess(
    companyId,
    userId,
    conversationId,
    messageId
  );
  const sources = await CopilotMessageSource.findAll({
    where: { companyId, messageId: message.id },
    order: [['id', 'ASC']],
  });

  const fileName = `copilot-answer-${message.id}-${Date.now()}.pdf`;
  const filePath = path.join(exportRoot(companyId), fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    doc.fontSize(16).text('Copilot Answer Export', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#444');
    doc.text(`Company ID: ${companyId}`);
    doc.text(`User: ${userName || userId}`);
    doc.text(`Generated: ${new Date().toISOString()}`);
    doc.text(`Conversation: ${conversation.title || conversation.id}`);
    doc.text(`Message ID: ${message.id}`);
    doc.moveDown();
    doc.fillColor('#000').fontSize(11).text(message.content || '', { align: 'left' });
    doc.moveDown();
    doc.fontSize(12).text('Sources', { underline: true });
    doc.fontSize(9);
    if (!sources.length) {
      doc.text('(none)');
    } else {
      sources.forEach((s, i) => {
        doc.text(
          `${i + 1}. [${s.sourceType}] ${s.sourceLabel || ''}` +
            (s.pageNumber != null ? ` p.${s.pageNumber}` : '')
        );
      });
    }
    doc.moveDown();
    doc.fontSize(8).fillColor('#666').text(
      'Disclaimer: This document is AI-assisted and must be verified against ERP source records before operational use. Classification: Internal.'
    );
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  await writeAudit(userId, companyId, 'COPILOT_EXPORT_PDF', message.id, {
    conversationId,
    fileName,
  });

  return { filePath, fileName, mimeType: 'application/pdf' };
}

function flattenRows(table) {
  const rows = table?.rows;
  if (!Array.isArray(rows) || !rows.length) return [];
  return rows.map((r) => {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      const out = {};
      for (const [k, v] of Object.entries(r)) {
        out[k] = v != null && typeof v === 'object' ? JSON.stringify(v) : v;
      }
      return out;
    }
    return { value: r };
  });
}

async function exportToolXlsx({ companyId, userId, conversationId, messageId, toolName }) {
  const { message } = await assertMessageAccess(companyId, userId, conversationId, messageId);
  const artifacts = Array.isArray(message.artifactsJson) ? message.artifactsJson : [];
  let tableArt = artifacts.find(
    (a) =>
      a.type === 'table' && (!toolName || a.toolName === toolName)
  );
  if (!tableArt) {
    tableArt = artifacts.find((a) => a.type === 'table');
  }
  if (!tableArt?.table?.rows?.length) {
    const err = new Error('No tabular tool data on this message to export');
    err.status = 400;
    throw err;
  }

  const rows = flattenRows(tableArt.table);
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, (tableArt.table.name || 'data').slice(0, 31));
  const meta = XLSX.utils.aoa_to_sheet([
    ['Company ID', companyId],
    ['User ID', userId],
    ['Generated', new Date().toISOString()],
    ['Tool', tableArt.toolName],
    ['Disclaimer', 'AI-assisted export — verify against ERP before use. Classification: Internal.'],
  ]);
  XLSX.utils.book_append_sheet(wb, meta, 'meta');

  const fileName = `copilot-tool-${message.id}-${Date.now()}.xlsx`;
  const filePath = path.join(exportRoot(companyId), fileName);
  XLSX.writeFile(wb, filePath);

  await writeAudit(userId, companyId, 'COPILOT_EXPORT_XLSX', message.id, {
    conversationId,
    fileName,
    toolName: tableArt.toolName,
    rowCount: rows.length,
  });

  return {
    filePath,
    fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
}

module.exports = {
  exportAnswerPdf,
  exportToolXlsx,
  exportRoot,
};
