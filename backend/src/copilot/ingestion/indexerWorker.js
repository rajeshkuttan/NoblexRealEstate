'use strict';

const { Op } = require('sequelize');
const { CopilotDocument, CopilotDocumentChunk } = require('../../models');
const { extractText } = require('./extractors');
const { chunkText } = require('./chunker');
const { isCopilotEnabled, getCopilotConfig } = require('../config/copilotConfig');
const { logCopilot } = require('../observability/copilotLogger');
const { getEmbeddingProvider } = require('../embeddings/embeddingProvider');
const { getVectorStore, getRetrievalMode } = require('../retrieval');

let timer = null;
let running = false;

const STUCK_MS = 10 * 60 * 1000;

async function claimNextDocument() {
  const stuckBefore = new Date(Date.now() - STUCK_MS);
  await CopilotDocument.update(
    { ingestionStatus: 'pending', extractionStatus: 'pending', indexingStatus: 'pending' },
    {
      where: {
        ingestionStatus: 'processing',
        updatedAt: { [Op.lt]: stuckBefore },
      },
    }
  );

  const doc = await CopilotDocument.findOne({
    where: { ingestionStatus: 'pending' },
    order: [['id', 'ASC']],
  });
  if (!doc) return null;

  const [affected] = await CopilotDocument.update(
    {
      ingestionStatus: 'processing',
      extractionStatus: 'processing',
      indexingStatus: 'processing',
      lastError: null,
    },
    { where: { id: doc.id, ingestionStatus: 'pending' } }
  );
  if (!affected) return null;
  return CopilotDocument.findByPk(doc.id);
}

async function maybeIndexVectors(doc, createdChunks) {
  const mode = getRetrievalMode();
  if (mode === 'mysql' || !createdChunks.length) return;

  const cfg = getCopilotConfig();
  const embedder = getEmbeddingProvider();
  const health = await embedder.healthCheck();
  if (!health.configured) {
    logCopilot('info', 'vector_index_skipped_no_embeddings', { documentId: doc.id, mode });
    return;
  }

  const texts = createdChunks.map((c) => c.content || c.contentPreview || '');
  const vectors = await embedder.embedTexts(texts);
  const store = getVectorStore();
  if (typeof store.upsertChunks !== 'function') return;

  await store.upsertChunks({
    companyId: doc.companyId,
    documentId: doc.id,
    chunks: createdChunks.map((c) => ({
      id: c.id,
      chunkId: c.id,
      chunkIndex: c.chunkIndex,
      pageNumber: c.pageNumber,
      sectionTitle: c.sectionTitle,
      content: c.content,
      contentPreview: c.contentPreview,
      documentTitle: doc.title,
    })),
    vectors,
  });

  await CopilotDocumentChunk.update(
    { embeddingModel: cfg.embeddingModel || cfg.embeddingProvider },
    { where: { documentId: doc.id, companyId: doc.companyId } }
  );
}

async function processDocument(doc) {
  try {
    if (!doc.filePath) {
      throw Object.assign(new Error('Missing file path'), { code: 'MISSING_FILE' });
    }
    const extracted = await extractText({
      filePath: doc.filePath,
      mimeType: doc.mimeType,
      originalName: doc.fileName,
    });
    if (!extracted.text) {
      throw Object.assign(new Error('No extractable text'), { code: 'EMPTY_TEXT' });
    }

    await doc.update({ extractionStatus: 'ready' });

    const pieces = chunkText(extracted.text);
    await CopilotDocumentChunk.destroy({
      where: { documentId: doc.id, companyId: doc.companyId },
    });

    // Best-effort remove prior vector points for this document
    try {
      const store = getVectorStore();
      if (typeof store.deleteDocument === 'function') {
        await store.deleteDocument({ companyId: doc.companyId, documentId: doc.id });
      }
    } catch (_) {
      /* mysql-only stores still work */
    }

    let createdChunks = [];
    if (pieces.length) {
      createdChunks = await CopilotDocumentChunk.bulkCreate(
        pieces.map((p) => ({
          companyId: doc.companyId,
          documentId: doc.id,
          chunkIndex: p.chunkIndex,
          pageNumber: p.pageNumber,
          sectionTitle: p.sectionTitle,
          content: p.content,
          contentHash: p.contentHash,
          tokenCount: p.tokenCount,
          contentPreview: p.contentPreview,
          embeddingModel: 'mysql-text',
          metadataJson: { pages: extracted.pages },
        })),
        { returning: true }
      );
      // MySQL/MariaDB may not return IDs from bulkCreate — reload
      if (!createdChunks[0]?.id) {
        createdChunks = await CopilotDocumentChunk.findAll({
          where: { documentId: doc.id, companyId: doc.companyId },
          order: [['chunkIndex', 'ASC']],
        });
      }
    }

    try {
      await maybeIndexVectors(doc, createdChunks);
    } catch (err) {
      logCopilot('error', 'vector_index_failed', {
        documentId: doc.id,
        error: err.message,
      });
      // MySQL text index remains usable even if vectors fail
    }

    await doc.update({
      ingestionStatus: 'ready',
      indexingStatus: 'ready',
      lastError: null,
    });
    logCopilot('info', 'document_indexed', {
      documentId: doc.id,
      companyId: doc.companyId,
      chunks: pieces.length,
      retrievalMode: getRetrievalMode(),
    });
  } catch (err) {
    logCopilot('error', 'document_index_failed', {
      documentId: doc.id,
      error: err.message,
      code: err.code,
    });
    await doc.update({
      ingestionStatus: 'failed',
      extractionStatus: err.code === 'EMPTY_TEXT' ? 'failed' : doc.extractionStatus,
      indexingStatus: 'failed',
      lastError: String(err.message || err).slice(0, 2000),
    });
  }
}

async function tick() {
  if (running || !isCopilotEnabled()) return;
  running = true;
  try {
    const doc = await claimNextDocument();
    if (doc) await processDocument(doc);
  } catch (err) {
    logCopilot('error', 'indexer_tick_failed', { error: err.message });
  } finally {
    running = false;
  }
}

function startIndexerWorker() {
  if (timer) return;
  if (!isCopilotEnabled()) {
    logCopilot('info', 'indexer_not_started_disabled', {});
    return;
  }
  const ms = getCopilotConfig().indexerIntervalMs;
  timer = setInterval(() => {
    void tick();
  }, ms);
  if (typeof timer.unref === 'function') timer.unref();
  logCopilot('info', 'indexer_started', { intervalMs: ms, retrievalMode: getRetrievalMode() });
  void tick();
}

function stopIndexerWorker() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  startIndexerWorker,
  stopIndexerWorker,
  tick,
  processDocument,
  claimNextDocument,
  maybeIndexVectors,
};
