'use strict';

/**
 * Retrieval factory. Default remains MySQL text search.
 * COPILOT_RETRIEVAL_MODE=mysql|qdrant|hybrid
 */
const { getCopilotConfig } = require('../config/copilotConfig');
const { MysqlTextSearchProvider } = require('./mysqlTextSearchProvider');
const { QdrantVectorStoreProvider } = require('./qdrantProvider');
const { HybridRetrievalProvider } = require('./hybridRetrievalProvider');
const { logCopilot } = require('../observability/copilotLogger');

let singleton = null;

function createVectorStore(mode) {
  const m = String(mode || 'mysql').toLowerCase();
  if (m === 'qdrant') {
    return new QdrantVectorStoreProvider();
  }
  if (m === 'hybrid') {
    return new HybridRetrievalProvider();
  }
  return new MysqlTextSearchProvider();
}

function getVectorStore() {
  if (!singleton) {
    const cfg = getCopilotConfig();
    singleton = createVectorStore(cfg.retrievalMode);
    logCopilot('info', 'vector_store_selected', { mode: cfg.retrievalMode });
  }
  return singleton;
}

function resetVectorStoreForTests() {
  singleton = null;
  // Also clear mysql module singleton if present
  try {
    const mysql = require('./mysqlTextSearchProvider');
    if (typeof mysql.resetMysqlStoreForTests === 'function') {
      mysql.resetMysqlStoreForTests();
    }
  } catch (_) {
    /* ignore */
  }
}

function getRetrievalMode() {
  return getCopilotConfig().retrievalMode;
}

module.exports = {
  getVectorStore,
  createVectorStore,
  resetVectorStoreForTests,
  getRetrievalMode,
};
