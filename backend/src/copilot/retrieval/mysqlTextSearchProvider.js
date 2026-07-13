'use strict';

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { CopilotDocumentChunk } = require('../../models');
const { VectorStoreProvider } = require('./vectorStoreProvider');
const { getCopilotConfig } = require('../config/copilotConfig');

function mapRows(rows) {
  return rows.map((r, i) => ({
    chunkId: r.id,
    companyId: r.companyId,
    documentId: r.documentId,
    documentTitle: r.documentTitle,
    chunkIndex: r.chunkIndex,
    pageNumber: r.pageNumber,
    sectionTitle: r.sectionTitle,
    content: r.content,
    contentPreview: r.contentPreview || String(r.content || '').slice(0, 280),
    score: Number(r.score) || 0,
    rank: i + 1,
  }));
}

class MysqlTextSearchProvider extends VectorStoreProvider {
  async healthCheck() {
    try {
      await sequelize.query('SELECT 1', { type: QueryTypes.SELECT });
      return { ok: true, provider: 'mysql-text' };
    } catch (err) {
      return { ok: false, provider: 'mysql-text', error: err.message };
    }
  }

  async deleteDocument({ companyId, documentId }) {
    await CopilotDocumentChunk.destroy({ where: { companyId, documentId } });
  }

  /**
   * Company-scoped search over ready documents only.
   * Optional entityType/entityId prefer matching documents, then fall back company-wide.
   */
  async search({ companyId, query, limit, entityType = null, entityId = null } = {}) {
    const cfg = getCopilotConfig();
    const top = Math.min(Number(limit) || cfg.retrievalLimit || 6, 12);
    const q = String(query || '').trim();
    if (!q || !companyId) return [];

    const entityFilter =
      entityType && entityId
        ? ' AND d.entity_type = :entityType AND d.entity_id = :entityId'
        : '';

    const replacements = {
      companyId,
      q,
      lim: top,
      ...(entityType && entityId ? { entityType, entityId: Number(entityId) } : {}),
    };

    const runFulltext = async (withEntity) => {
      const filter = withEntity ? entityFilter : '';
      return sequelize.query(
        `SELECT c.id, c.company_id AS companyId, c.document_id AS documentId,
                c.chunk_index AS chunkIndex, c.page_number AS pageNumber,
                c.section_title AS sectionTitle, c.content, c.content_preview AS contentPreview,
                d.title AS documentTitle,
                MATCH(c.content) AGAINST(:q IN NATURAL LANGUAGE MODE) AS score
         FROM copilot_document_chunks c
         INNER JOIN copilot_documents d ON d.id = c.document_id AND d.deleted_at IS NULL
         WHERE c.company_id = :companyId
           AND d.company_id = :companyId
           AND d.ingestion_status = 'ready'
           AND d.indexing_status = 'ready'
           ${filter}
           AND MATCH(c.content) AGAINST(:q IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC
         LIMIT :lim`,
        { replacements, type: QueryTypes.SELECT }
      );
    };

    const runLike = async (withEntity) => {
      const filter = withEntity ? entityFilter : '';
      const like = `%${q.replace(/[%_]/g, '').slice(0, 80)}%`;
      return sequelize.query(
        `SELECT c.id, c.company_id AS companyId, c.document_id AS documentId,
                c.chunk_index AS chunkIndex, c.page_number AS pageNumber,
                c.section_title AS sectionTitle, c.content, c.content_preview AS contentPreview,
                d.title AS documentTitle, 0 AS score
         FROM copilot_document_chunks c
         INNER JOIN copilot_documents d ON d.id = c.document_id AND d.deleted_at IS NULL
         WHERE c.company_id = :companyId
           AND d.company_id = :companyId
           AND d.ingestion_status = 'ready'
           AND d.indexing_status = 'ready'
           ${filter}
           AND c.content LIKE :like
         ORDER BY c.id DESC
         LIMIT :lim`,
        { replacements: { ...replacements, like }, type: QueryTypes.SELECT }
      );
    };

    try {
      if (entityType && entityId) {
        const scoped = await runFulltext(true);
        if (scoped.length) return mapRows(scoped);
      }
      const rows = await runFulltext(false);
      if (rows.length) return mapRows(rows);
    } catch (_) {
      /* FULLTEXT unavailable */
    }

    if (entityType && entityId) {
      const scoped = await runLike(true);
      if (scoped.length) return mapRows(scoped);
    }
    return mapRows(await runLike(false));
  }
}

let singleton = null;
function getMysqlTextStore() {
  if (!singleton) singleton = new MysqlTextSearchProvider();
  return singleton;
}

function resetMysqlStoreForTests() {
  singleton = null;
}

/** @deprecated Use require('../retrieval').getVectorStore */
function getVectorStore() {
  return getMysqlTextStore();
}

module.exports = {
  MysqlTextSearchProvider,
  getMysqlTextStore,
  getVectorStore,
  resetMysqlStoreForTests,
};
