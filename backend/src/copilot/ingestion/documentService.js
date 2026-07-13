'use strict';

const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { CopilotDocument, CopilotDocumentChunk } = require('../../models');
const { getCopilotConfig, getAllowedMimeTypes } = require('../config/copilotConfig');
const { sha256File } = require('./extractors');
const { logCopilot } = require('../observability/copilotLogger');

function resolveUploadRoot() {
  const cfg = getCopilotConfig();
  if (cfg.uploadDir) return path.resolve(cfg.uploadDir);
  return path.join(__dirname, '../../../uploads/copilot');
}

function ensureUploadDir(companyId) {
  const root = resolveUploadRoot();
  const dir = path.join(root, String(companyId));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function validateUpload(file) {
  const cfg = getCopilotConfig();
  if (!file) {
    const err = new Error('file is required');
    err.status = 400;
    err.code = 'FILE_REQUIRED';
    throw err;
  }
  if (file.size > cfg.maxFileSize) {
    const err = new Error(`File exceeds max size of ${cfg.maxFileSize} bytes`);
    err.status = 400;
    err.code = 'FILE_TOO_LARGE';
    throw err;
  }
  const allowed = getAllowedMimeTypes();
  if (file.mimetype && !allowed.includes(file.mimetype)) {
    const err = new Error(`MIME type not allowed: ${file.mimetype}`);
    err.status = 400;
    err.code = 'MIME_REJECTED';
    throw err;
  }
}

async function listDocuments(companyId, { limit = 50 } = {}) {
  return CopilotDocument.findAll({
    where: { companyId },
    order: [['updatedAt', 'DESC']],
    limit: Math.min(Number(limit) || 50, 100),
  });
}

async function getDocument(companyId, id) {
  const doc = await CopilotDocument.findOne({ where: { id, companyId } });
  if (!doc) return null;
  const chunks = await CopilotDocumentChunk.count({ where: { documentId: doc.id, companyId } });
  const plain = doc.toJSON();
  plain.chunkCount = chunks;
  return plain;
}

/**
 * Persist upload metadata and queue for indexing. Dedupes by company + checksum.
 */
async function createFromUpload(companyId, userId, file, meta = {}) {
  validateUpload(file);
  const dir = ensureUploadDir(companyId);
  const safeName = `${Date.now()}-${(file.originalname || 'document').replace(/[^\w.\-]+/g, '_')}`;
  const dest = path.join(dir, safeName);
  fs.renameSync(file.path, dest);

  const checksum = sha256File(dest);
  const existing = await CopilotDocument.findOne({
    where: { companyId, checksum, ingestionStatus: { [Op.ne]: 'failed' } },
  });
  if (existing) {
    try {
      fs.unlinkSync(dest);
    } catch (_) {
      /* ignore */
    }
    return { document: existing, duplicate: true };
  }

  const title =
    (meta.title && String(meta.title).trim()) ||
    path.parse(file.originalname || safeName).name ||
    'Untitled document';

  const document = await CopilotDocument.create({
    companyId,
    module: meta.module || 'general',
    entityType: meta.entityType || null,
    entityId: meta.entityId || null,
    documentType: meta.documentType || null,
    title,
    fileName: file.originalname || safeName,
    filePath: dest,
    mimeType: file.mimetype,
    fileSize: file.size,
    checksum,
    language: meta.language || null,
    documentVersion: meta.documentVersion || '1',
    ingestionStatus: 'pending',
    extractionStatus: 'pending',
    indexingStatus: 'pending',
    sourceSystem: 'upload',
    uploadedBy: userId,
    lastError: null,
  });

  logCopilot('info', 'document_queued', { companyId, documentId: document.id });
  try {
    const { enqueueDocumentIndex } = require('./ingestQueue');
    await enqueueDocumentIndex(document.id);
  } catch (_) {
    /* indexer poll still picks it up */
  }
  return { document, duplicate: false };
}

async function reindexDocument(companyId, id) {
  const doc = await CopilotDocument.findOne({ where: { id, companyId } });
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }
  await CopilotDocumentChunk.destroy({ where: { documentId: doc.id, companyId } });
  await doc.update({
    ingestionStatus: 'pending',
    extractionStatus: 'pending',
    indexingStatus: 'pending',
    lastError: null,
  });
  try {
    const { enqueueDocumentIndex } = require('./ingestQueue');
    await enqueueDocumentIndex(doc.id);
  } catch (_) {
    const { tick } = require('./indexerWorker');
    void tick();
  }
  return doc;
}

async function deleteDocument(companyId, id) {
  const doc = await CopilotDocument.findOne({ where: { id, companyId } });
  if (!doc) {
    const err = new Error('Document not found');
    err.status = 404;
    throw err;
  }
  await CopilotDocumentChunk.destroy({ where: { documentId: doc.id, companyId } });
  if (doc.filePath && fs.existsSync(doc.filePath)) {
    try {
      fs.unlinkSync(doc.filePath);
    } catch (_) {
      /* ignore */
    }
  }
  await doc.destroy();
  return { deleted: true };
}

module.exports = {
  resolveUploadRoot,
  ensureUploadDir,
  validateUpload,
  listDocuments,
  getDocument,
  createFromUpload,
  reindexDocument,
  deleteDocument,
};
