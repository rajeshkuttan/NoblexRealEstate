'use strict';

const { VectorStoreProvider } = require('./vectorStoreProvider');
const { getCopilotConfig } = require('../config/copilotConfig');
const { getEmbeddingProvider } = require('../embeddings/embeddingProvider');
const { logCopilot } = require('../observability/copilotLogger');

/**
 * Optional Qdrant vector store via REST. Company filter is mandatory on search.
 */
class QdrantVectorStoreProvider extends VectorStoreProvider {
  constructor(cfg = getCopilotConfig()) {
    super();
    this.url = String(cfg.qdrantUrl || '').replace(/\/$/, '');
    this.collection = cfg.qdrantCollection || 'copilot_chunks';
    this.apiKey = cfg.qdrantApiKey || '';
    this.dims = cfg.embeddingDims || 1536;
  }

  headers() {
    const h = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['api-key'] = this.apiKey;
    return h;
  }

  async request(method, path, body) {
    if (!this.url) {
      throw Object.assign(new Error('Qdrant URL not configured'), { code: 'QDRANT_UNCONFIGURED' });
    }
    const res = await fetch(`${this.url}${path}`, {
      method,
      headers: this.headers(),
      body: body != null ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw Object.assign(new Error(`Qdrant ${res.status}: ${text.slice(0, 200)}`), {
        code: 'QDRANT_ERROR',
        status: res.status,
      });
    }
    if (res.status === 204) return null;
    return res.json();
  }

  async ensureCollection() {
    try {
      await this.request('GET', `/collections/${this.collection}`);
      return;
    } catch (_) {
      /* create */
    }
    await this.request('PUT', `/collections/${this.collection}`, {
      vectors: { size: this.dims, distance: 'Cosine' },
    });
  }

  async healthCheck() {
    if (!this.url) {
      return { ok: false, provider: 'qdrant', configured: false, error: 'COPILOT_QDRANT_URL unset' };
    }
    try {
      const data = await this.request('GET', '/readyz');
      return { ok: true, provider: 'qdrant', configured: true, ready: data };
    } catch (err) {
      try {
        await this.request('GET', '/');
        return { ok: true, provider: 'qdrant', configured: true };
      } catch (err2) {
        return { ok: false, provider: 'qdrant', configured: true, error: err2.message || err.message };
      }
    }
  }

  async upsertChunks({ companyId, documentId, chunks = [], vectors = [] }) {
    if (!chunks.length || !vectors.length) return { upserted: 0 };
    await this.ensureCollection();
    const points = chunks.map((c, i) => ({
      id: Number(c.id || c.chunkId),
      vector: vectors[i],
      payload: {
        companyId: Number(companyId),
        documentId: Number(documentId),
        chunkId: Number(c.id || c.chunkId),
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber ?? null,
        sectionTitle: c.sectionTitle || null,
        documentTitle: c.documentTitle || null,
        contentPreview: String(c.contentPreview || c.content || '').slice(0, 280),
        content: String(c.content || '').slice(0, 4000),
      },
    }));
    await this.request('PUT', `/collections/${this.collection}/points?wait=true`, { points });
    return { upserted: points.length };
  }

  async deleteDocument({ companyId, documentId }) {
    if (!this.url) return { deleted: false };
    try {
      await this.request('POST', `/collections/${this.collection}/points/delete?wait=true`, {
        filter: {
          must: [
            { key: 'companyId', match: { value: Number(companyId) } },
            { key: 'documentId', match: { value: Number(documentId) } },
          ],
        },
      });
      return { deleted: true };
    } catch (err) {
      logCopilot('error', 'qdrant_delete_failed', { error: err.message, companyId, documentId });
      return { deleted: false, error: err.message };
    }
  }

  async search({ companyId, query, limit = 6, entityType = null, entityId = null } = {}) {
    if (!companyId || !query) return [];
    const embedder = getEmbeddingProvider();
    const [vector] = await embedder.embedTexts([query]);
    if (!vector || !vector.length) return [];

    const must = [{ key: 'companyId', match: { value: Number(companyId) } }];
    if (entityType && entityId) {
      // Document-level entity filter is applied in MySQL hybrid path; Qdrant payload may lack it.
    }

    const data = await this.request('POST', `/collections/${this.collection}/points/search`, {
      vector,
      limit: Math.min(Number(limit) || 6, 12),
      with_payload: true,
      filter: { must },
    });

    const hits = data?.result || data || [];
    return (Array.isArray(hits) ? hits : []).map((h, i) => {
      const p = h.payload || {};
      return {
        chunkId: p.chunkId || h.id,
        companyId: p.companyId,
        documentId: p.documentId,
        documentTitle: p.documentTitle,
        chunkIndex: p.chunkIndex,
        pageNumber: p.pageNumber,
        sectionTitle: p.sectionTitle,
        content: p.content,
        contentPreview: p.contentPreview,
        score: Number(h.score) || 0,
        rank: i + 1,
        source: 'qdrant',
      };
    });
  }
}

module.exports = { QdrantVectorStoreProvider };
