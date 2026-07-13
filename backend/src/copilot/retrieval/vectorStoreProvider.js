'use strict';

/**
 * Vector store abstraction. Phase 2 uses MySQL text search;
 * Qdrant can implement the same surface later.
 */
class VectorStoreProvider {
  async healthCheck() {
    return { ok: true, provider: this.constructor.name };
  }

  async upsertChunks() {
    throw new Error('upsertChunks not implemented');
  }

  async deleteDocument() {
    throw new Error('deleteDocument not implemented');
  }

  async search() {
    throw new Error('search not implemented');
  }
}

module.exports = { VectorStoreProvider };
