'use strict';

const { VectorStoreProvider } = require('./vectorStoreProvider');
const { MysqlTextSearchProvider } = require('./mysqlTextSearchProvider');
const { QdrantVectorStoreProvider } = require('./qdrantProvider');
const { logCopilot } = require('../observability/copilotLogger');

/**
 * Reciprocal Rank Fusion merge of ranked result lists.
 */
function reciprocalRankFusion(lists, { k = 60, limit = 12 } = {}) {
  const scores = new Map();
  const items = new Map();
  for (const list of lists) {
    (list || []).forEach((item, idx) => {
      const id = item.chunkId;
      if (id == null) return;
      const add = 1 / (k + idx + 1);
      scores.set(id, (scores.get(id) || 0) + add);
      if (!items.has(id)) items.set(id, item);
    });
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, score], i) => ({
      ...items.get(id),
      score,
      rank: i + 1,
      source: 'hybrid',
    }));
}

class HybridRetrievalProvider extends VectorStoreProvider {
  constructor({ mysql, qdrant } = {}) {
    super();
    this.mysql = mysql || new MysqlTextSearchProvider();
    this.qdrant = qdrant || new QdrantVectorStoreProvider();
  }

  async healthCheck() {
    const [m, q] = await Promise.all([this.mysql.healthCheck(), this.qdrant.healthCheck()]);
    return {
      ok: m.ok || q.ok,
      provider: 'hybrid',
      mysql: m,
      qdrant: q,
    };
  }

  async upsertChunks(args) {
    const results = { mysql: true };
    try {
      results.qdrant = await this.qdrant.upsertChunks(args);
    } catch (err) {
      logCopilot('error', 'hybrid_qdrant_upsert_failed', { error: err.message });
      results.qdrantError = err.message;
    }
    return results;
  }

  async deleteDocument(args) {
    await this.mysql.deleteDocument(args);
    try {
      await this.qdrant.deleteDocument(args);
    } catch (err) {
      logCopilot('error', 'hybrid_qdrant_delete_failed', { error: err.message });
    }
  }

  async search(args) {
    let mysqlHits = [];
    let qdrantHits = [];
    try {
      mysqlHits = await this.mysql.search(args);
    } catch (err) {
      logCopilot('error', 'hybrid_mysql_search_failed', { error: err.message });
    }
    try {
      qdrantHits = await this.qdrant.search(args);
    } catch (err) {
      logCopilot('error', 'hybrid_qdrant_search_failed', { error: err.message });
    }
    if (!qdrantHits.length) return mysqlHits;
    if (!mysqlHits.length) return qdrantHits;
    return reciprocalRankFusion([mysqlHits, qdrantHits], { limit: args.limit || 6 });
  }
}

module.exports = { HybridRetrievalProvider, reciprocalRankFusion };
