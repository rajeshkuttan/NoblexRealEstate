'use strict';

const { INTEGER, STRING, TEXT, DATE, BOOLEAN, DECIMAL, JSON, ENUM, literal } = require('sequelize');

const companyFk = {
  type: INTEGER,
  allowNull: false,
  references: { model: 'company_settings', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
};

const timestamps = {
  created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
  updated_at: {
    type: DATE,
    allowNull: false,
    defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
  },
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = timestamps;
    const cfk = companyFk;

    await queryInterface.createTable('copilot_conversations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      title: { type: Sequelize.STRING(255), allowNull: true },
      module_context: { type: Sequelize.STRING(100), allowNull: true },
      entity_type: { type: Sequelize.STRING(100), allowNull: true },
      entity_id: { type: Sequelize.INTEGER, allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'archived', 'deleted'),
        allowNull: false,
        defaultValue: 'active',
      },
      model_provider: { type: Sequelize.STRING(50), allowNull: true },
      model_name: { type: Sequelize.STRING(100), allowNull: true },
      language: { type: Sequelize.STRING(10), allowNull: true, defaultValue: 'en' },
      ...ts,
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('copilot_conversations', ['company_id', 'user_id'], {
      name: 'idx_copilot_conv_company_user',
    });

    await queryInterface.createTable('copilot_messages', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      conversation_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'copilot_conversations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      role: {
        type: Sequelize.ENUM('user', 'assistant', 'system', 'tool'),
        allowNull: false,
      },
      content: { type: Sequelize.TEXT('long'), allowNull: false },
      normalized_query: { type: Sequelize.TEXT, allowNull: true },
      response_type: { type: Sequelize.STRING(50), allowNull: true },
      model_provider: { type: Sequelize.STRING(50), allowNull: true },
      model_name: { type: Sequelize.STRING(100), allowNull: true },
      prompt_tokens: { type: Sequelize.INTEGER, allowNull: true },
      completion_tokens: { type: Sequelize.INTEGER, allowNull: true },
      total_tokens: { type: Sequelize.INTEGER, allowNull: true },
      latency_ms: { type: Sequelize.INTEGER, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'completed', 'failed', 'blocked'),
        allowNull: false,
        defaultValue: 'completed',
      },
      error_code: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('copilot_messages', ['company_id', 'conversation_id'], {
      name: 'idx_copilot_msg_company_conv',
    });

    await queryInterface.createTable('copilot_message_sources', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      message_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'copilot_messages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      source_type: { type: Sequelize.STRING(50), allowNull: false },
      document_id: { type: Sequelize.INTEGER, allowNull: true },
      document_chunk_id: { type: Sequelize.INTEGER, allowNull: true },
      module: { type: Sequelize.STRING(100), allowNull: true },
      entity_type: { type: Sequelize.STRING(100), allowNull: true },
      entity_id: { type: Sequelize.INTEGER, allowNull: true },
      source_label: { type: Sequelize.STRING(255), allowNull: true },
      page_number: { type: Sequelize.INTEGER, allowNull: true },
      section_title: { type: Sequelize.STRING(255), allowNull: true },
      source_url: { type: Sequelize.STRING(500), allowNull: true },
      relevance_score: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
      retrieval_rank: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('copilot_message_sources', ['company_id', 'message_id'], {
      name: 'idx_copilot_src_company_msg',
    });

    await queryInterface.createTable('copilot_documents', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      module: { type: Sequelize.STRING(100), allowNull: true },
      entity_type: { type: Sequelize.STRING(100), allowNull: true },
      entity_id: { type: Sequelize.INTEGER, allowNull: true },
      document_type: { type: Sequelize.STRING(100), allowNull: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      file_name: { type: Sequelize.STRING(255), allowNull: true },
      file_path: { type: Sequelize.STRING(500), allowNull: true },
      mime_type: { type: Sequelize.STRING(100), allowNull: true },
      file_size: { type: Sequelize.INTEGER, allowNull: true },
      checksum: { type: Sequelize.STRING(128), allowNull: true },
      language: { type: Sequelize.STRING(10), allowNull: true },
      document_version: { type: Sequelize.STRING(50), allowNull: true },
      ingestion_status: {
        type: Sequelize.ENUM('pending', 'processing', 'ready', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      extraction_status: {
        type: Sequelize.ENUM('pending', 'processing', 'ready', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending',
      },
      indexing_status: {
        type: Sequelize.ENUM('pending', 'processing', 'ready', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'pending',
      },
      source_system: { type: Sequelize.STRING(100), allowNull: true },
      effective_date: { type: Sequelize.DATEONLY, allowNull: true },
      expiry_date: { type: Sequelize.DATEONLY, allowNull: true },
      uploaded_by: { type: Sequelize.INTEGER, allowNull: true },
      ...ts,
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });
    await queryInterface.addIndex('copilot_documents', ['company_id', 'indexing_status'], {
      name: 'idx_copilot_docs_company_index',
    });

    await queryInterface.createTable('copilot_document_chunks', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      document_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'copilot_documents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      chunk_index: { type: Sequelize.INTEGER, allowNull: false },
      page_number: { type: Sequelize.INTEGER, allowNull: true },
      section_title: { type: Sequelize.STRING(255), allowNull: true },
      content_hash: { type: Sequelize.STRING(128), allowNull: true },
      token_count: { type: Sequelize.INTEGER, allowNull: true },
      content_preview: { type: Sequelize.TEXT, allowNull: true },
      vector_point_id: { type: Sequelize.STRING(100), allowNull: true },
      embedding_model: { type: Sequelize.STRING(100), allowNull: true },
      metadata_json: { type: Sequelize.JSON, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('copilot_document_chunks', ['company_id', 'document_id'], {
      name: 'idx_copilot_chunks_company_doc',
    });

    await queryInterface.createTable('copilot_tool_runs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      conversation_id: { type: Sequelize.INTEGER, allowNull: true },
      message_id: { type: Sequelize.INTEGER, allowNull: true },
      user_id: { type: Sequelize.INTEGER, allowNull: true },
      tool_name: { type: Sequelize.STRING(100), allowNull: false },
      module: { type: Sequelize.STRING(100), allowNull: true },
      input_json: { type: Sequelize.JSON, allowNull: true },
      output_summary: { type: Sequelize.TEXT, allowNull: true },
      output_record_count: { type: Sequelize.INTEGER, allowNull: true },
      permission_code: { type: Sequelize.STRING(150), allowNull: true },
      status: {
        type: Sequelize.ENUM('success', 'denied', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'success',
      },
      latency_ms: { type: Sequelize.INTEGER, allowNull: true },
      error_code: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('copilot_tool_runs', ['company_id', 'created_at'], {
      name: 'idx_copilot_tools_company_created',
    });

    await queryInterface.createTable('copilot_feedback', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      message_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'copilot_messages', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      user_id: { type: Sequelize.INTEGER, allowNull: false },
      rating: { type: Sequelize.INTEGER, allowNull: true },
      feedback_type: { type: Sequelize.STRING(50), allowNull: true },
      comment: { type: Sequelize.TEXT, allowNull: true },
      expected_answer: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('copilot_prompt_versions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: Sequelize.INTEGER, allowNull: true },
      prompt_key: { type: Sequelize.STRING(100), allowNull: false },
      version: { type: Sequelize.STRING(50), allowNull: false },
      content: { type: Sequelize.TEXT('long'), allowNull: false },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'retired'),
        allowNull: false,
        defaultValue: 'draft',
      },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      approved_by: { type: Sequelize.INTEGER, allowNull: true },
      effective_from: { type: Sequelize.DATE, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('copilot_prompt_versions', ['prompt_key', 'version'], {
      unique: true,
      name: 'idx_copilot_prompt_key_version',
    });

    await queryInterface.createTable('copilot_provider_configurations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: Sequelize.INTEGER, allowNull: true },
      provider_type: { type: Sequelize.STRING(50), allowNull: false },
      provider_name: { type: Sequelize.STRING(100), allowNull: false },
      model_name: { type: Sequelize.STRING(100), allowNull: true },
      embedding_model: { type: Sequelize.STRING(100), allowNull: true },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      is_default: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      max_tokens: { type: Sequelize.INTEGER, allowNull: true },
      temperature: { type: Sequelize.DECIMAL(4, 2), allowNull: true },
      timeout_ms: { type: Sequelize.INTEGER, allowNull: true },
      retry_count: { type: Sequelize.INTEGER, allowNull: true },
      rate_limit_per_minute: { type: Sequelize.INTEGER, allowNull: true },
      encrypted_secret_reference: { type: Sequelize.STRING(255), allowNull: true },
      settings_json: { type: Sequelize.JSON, allowNull: true },
      ...ts,
    });

    await queryInterface.createTable('copilot_policies', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      policy_key: { type: Sequelize.STRING(100), allowNull: false },
      policy_type: { type: Sequelize.STRING(50), allowNull: false },
      module: { type: Sequelize.STRING(100), allowNull: true },
      permission_code: { type: Sequelize.STRING(150), allowNull: true },
      rules_json: { type: Sequelize.JSON, allowNull: true },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      updated_by: { type: Sequelize.INTEGER, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('copilot_policies', ['company_id', 'policy_key'], {
      unique: true,
      name: 'idx_copilot_policy_company_key',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('copilot_policies');
    await queryInterface.dropTable('copilot_provider_configurations');
    await queryInterface.dropTable('copilot_prompt_versions');
    await queryInterface.dropTable('copilot_feedback');
    await queryInterface.dropTable('copilot_tool_runs');
    await queryInterface.dropTable('copilot_document_chunks');
    await queryInterface.dropTable('copilot_documents');
    await queryInterface.dropTable('copilot_message_sources');
    await queryInterface.dropTable('copilot_messages');
    await queryInterface.dropTable('copilot_conversations');
  },
};
