'use strict';

/**
 * Phase 2: store full chunk text for MySQL retrieval (Qdrant deferred).
 * Also adds last_error on documents for indexer diagnostics.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('copilot_document_chunks', 'content', {
      type: Sequelize.TEXT('long'),
      allowNull: true,
      after: 'section_title',
    });

    await queryInterface.addColumn('copilot_documents', 'last_error', {
      type: Sequelize.TEXT,
      allowNull: true,
      after: 'uploaded_by',
    });

    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE copilot_document_chunks ADD FULLTEXT INDEX ft_copilot_chunk_content (content)'
      );
    } catch (err) {
      // FULLTEXT may be unavailable on some MySQL configs; LIKE fallback still works.
      console.warn('[copilot] FULLTEXT index skipped:', err.message);
    }
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.sequelize.query(
        'ALTER TABLE copilot_document_chunks DROP INDEX ft_copilot_chunk_content'
      );
    } catch (_) {
      /* ignore */
    }
    await queryInterface.removeColumn('copilot_documents', 'last_error');
    await queryInterface.removeColumn('copilot_document_chunks', 'content');
  },
};
