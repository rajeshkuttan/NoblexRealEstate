const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CopilotConversation = sequelize.define(
  'CopilotConversation',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    title: { type: DataTypes.STRING(255), allowNull: true },
    moduleContext: { type: DataTypes.STRING(100), allowNull: true, field: 'module_context' },
    entityType: { type: DataTypes.STRING(100), allowNull: true, field: 'entity_type' },
    entityId: { type: DataTypes.INTEGER, allowNull: true, field: 'entity_id' },
    status: {
      type: DataTypes.ENUM('active', 'archived', 'deleted'),
      allowNull: false,
      defaultValue: 'active',
    },
    modelProvider: { type: DataTypes.STRING(50), allowNull: true, field: 'model_provider' },
    modelName: { type: DataTypes.STRING(100), allowNull: true, field: 'model_name' },
    language: { type: DataTypes.STRING(10), allowNull: true, defaultValue: 'en' },
  },
  {
    tableName: 'copilot_conversations',
    underscored: true,
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);

const CopilotMessage = sequelize.define(
  'CopilotMessage',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    conversationId: { type: DataTypes.INTEGER, allowNull: false, field: 'conversation_id' },
    userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
    role: {
      type: DataTypes.ENUM('user', 'assistant', 'system', 'tool'),
      allowNull: false,
    },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    normalizedQuery: { type: DataTypes.TEXT, allowNull: true, field: 'normalized_query' },
    responseType: { type: DataTypes.STRING(50), allowNull: true, field: 'response_type' },
    modelProvider: { type: DataTypes.STRING(50), allowNull: true, field: 'model_provider' },
    modelName: { type: DataTypes.STRING(100), allowNull: true, field: 'model_name' },
    promptTokens: { type: DataTypes.INTEGER, allowNull: true, field: 'prompt_tokens' },
    completionTokens: { type: DataTypes.INTEGER, allowNull: true, field: 'completion_tokens' },
    totalTokens: { type: DataTypes.INTEGER, allowNull: true, field: 'total_tokens' },
    latencyMs: { type: DataTypes.INTEGER, allowNull: true, field: 'latency_ms' },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'blocked'),
      allowNull: false,
      defaultValue: 'completed',
    },
    errorCode: { type: DataTypes.STRING(100), allowNull: true, field: 'error_code' },
    artifactsJson: { type: DataTypes.JSON, allowNull: true, field: 'artifacts_json' },
  },
  {
    tableName: 'copilot_messages',
    underscored: true,
    updatedAt: false,
  }
);

const CopilotMessageSource = sequelize.define(
  'CopilotMessageSource',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    messageId: { type: DataTypes.INTEGER, allowNull: false, field: 'message_id' },
    sourceType: { type: DataTypes.STRING(50), allowNull: false, field: 'source_type' },
    documentId: { type: DataTypes.INTEGER, allowNull: true, field: 'document_id' },
    documentChunkId: { type: DataTypes.INTEGER, allowNull: true, field: 'document_chunk_id' },
    module: { type: DataTypes.STRING(100), allowNull: true },
    entityType: { type: DataTypes.STRING(100), allowNull: true, field: 'entity_type' },
    entityId: { type: DataTypes.INTEGER, allowNull: true, field: 'entity_id' },
    sourceLabel: { type: DataTypes.STRING(255), allowNull: true, field: 'source_label' },
    pageNumber: { type: DataTypes.INTEGER, allowNull: true, field: 'page_number' },
    sectionTitle: { type: DataTypes.STRING(255), allowNull: true, field: 'section_title' },
    sourceUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'source_url' },
    relevanceScore: { type: DataTypes.DECIMAL(8, 4), allowNull: true, field: 'relevance_score' },
    retrievalRank: { type: DataTypes.INTEGER, allowNull: true, field: 'retrieval_rank' },
  },
  {
    tableName: 'copilot_message_sources',
    underscored: true,
    updatedAt: false,
  }
);

const CopilotDocument = sequelize.define(
  'CopilotDocument',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    module: { type: DataTypes.STRING(100), allowNull: true },
    entityType: { type: DataTypes.STRING(100), allowNull: true, field: 'entity_type' },
    entityId: { type: DataTypes.INTEGER, allowNull: true, field: 'entity_id' },
    documentType: { type: DataTypes.STRING(100), allowNull: true, field: 'document_type' },
    title: { type: DataTypes.STRING(255), allowNull: false },
    fileName: { type: DataTypes.STRING(255), allowNull: true, field: 'file_name' },
    filePath: { type: DataTypes.STRING(500), allowNull: true, field: 'file_path' },
    mimeType: { type: DataTypes.STRING(100), allowNull: true, field: 'mime_type' },
    fileSize: { type: DataTypes.INTEGER, allowNull: true, field: 'file_size' },
    checksum: { type: DataTypes.STRING(128), allowNull: true },
    language: { type: DataTypes.STRING(10), allowNull: true },
    documentVersion: { type: DataTypes.STRING(50), allowNull: true, field: 'document_version' },
    ingestionStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'ready', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'ingestion_status',
    },
    extractionStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'ready', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'extraction_status',
    },
    indexingStatus: {
      type: DataTypes.ENUM('pending', 'processing', 'ready', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'pending',
      field: 'indexing_status',
    },
    sourceSystem: { type: DataTypes.STRING(100), allowNull: true, field: 'source_system' },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'effective_date' },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: true, field: 'expiry_date' },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'uploaded_by' },
    lastError: { type: DataTypes.TEXT, allowNull: true, field: 'last_error' },
  },
  {
    tableName: 'copilot_documents',
    underscored: true,
    paranoid: true,
    deletedAt: 'deleted_at',
  }
);

const CopilotDocumentChunk = sequelize.define(
  'CopilotDocumentChunk',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    documentId: { type: DataTypes.INTEGER, allowNull: false, field: 'document_id' },
    chunkIndex: { type: DataTypes.INTEGER, allowNull: false, field: 'chunk_index' },
    pageNumber: { type: DataTypes.INTEGER, allowNull: true, field: 'page_number' },
    sectionTitle: { type: DataTypes.STRING(255), allowNull: true, field: 'section_title' },
    content: { type: DataTypes.TEXT('long'), allowNull: true },
    contentHash: { type: DataTypes.STRING(128), allowNull: true, field: 'content_hash' },
    tokenCount: { type: DataTypes.INTEGER, allowNull: true, field: 'token_count' },
    contentPreview: { type: DataTypes.TEXT, allowNull: true, field: 'content_preview' },
    vectorPointId: { type: DataTypes.STRING(100), allowNull: true, field: 'vector_point_id' },
    embeddingModel: { type: DataTypes.STRING(100), allowNull: true, field: 'embedding_model' },
    metadataJson: { type: DataTypes.JSON, allowNull: true, field: 'metadata_json' },
  },
  { tableName: 'copilot_document_chunks', underscored: true }
);

const CopilotToolRun = sequelize.define(
  'CopilotToolRun',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    conversationId: { type: DataTypes.INTEGER, allowNull: true, field: 'conversation_id' },
    messageId: { type: DataTypes.INTEGER, allowNull: true, field: 'message_id' },
    userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
    toolName: { type: DataTypes.STRING(100), allowNull: false, field: 'tool_name' },
    module: { type: DataTypes.STRING(100), allowNull: true },
    inputJson: { type: DataTypes.JSON, allowNull: true, field: 'input_json' },
    outputSummary: { type: DataTypes.TEXT, allowNull: true, field: 'output_summary' },
    outputRecordCount: { type: DataTypes.INTEGER, allowNull: true, field: 'output_record_count' },
    permissionCode: { type: DataTypes.STRING(150), allowNull: true, field: 'permission_code' },
    status: {
      type: DataTypes.ENUM('success', 'denied', 'failed', 'skipped'),
      allowNull: false,
      defaultValue: 'success',
    },
    latencyMs: { type: DataTypes.INTEGER, allowNull: true, field: 'latency_ms' },
    errorCode: { type: DataTypes.STRING(100), allowNull: true, field: 'error_code' },
  },
  {
    tableName: 'copilot_tool_runs',
    underscored: true,
    updatedAt: false,
  }
);

const CopilotFeedback = sequelize.define(
  'CopilotFeedback',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    messageId: { type: DataTypes.INTEGER, allowNull: false, field: 'message_id' },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    rating: { type: DataTypes.INTEGER, allowNull: true },
    feedbackType: { type: DataTypes.STRING(50), allowNull: true, field: 'feedback_type' },
    comment: { type: DataTypes.TEXT, allowNull: true },
    expectedAnswer: { type: DataTypes.TEXT, allowNull: true, field: 'expected_answer' },
  },
  {
    tableName: 'copilot_feedback',
    underscored: true,
    updatedAt: false,
  }
);

const CopilotPromptVersion = sequelize.define(
  'CopilotPromptVersion',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: true, field: 'company_id' },
    promptKey: { type: DataTypes.STRING(100), allowNull: false, field: 'prompt_key' },
    version: { type: DataTypes.STRING(50), allowNull: false },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'retired'),
      allowNull: false,
      defaultValue: 'draft',
    },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    approvedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'approved_by' },
    effectiveFrom: { type: DataTypes.DATE, allowNull: true, field: 'effective_from' },
  },
  { tableName: 'copilot_prompt_versions', underscored: true }
);

const CopilotProviderConfiguration = sequelize.define(
  'CopilotProviderConfiguration',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: true, field: 'company_id' },
    providerType: { type: DataTypes.STRING(50), allowNull: false, field: 'provider_type' },
    providerName: { type: DataTypes.STRING(100), allowNull: false, field: 'provider_name' },
    modelName: { type: DataTypes.STRING(100), allowNull: true, field: 'model_name' },
    embeddingModel: { type: DataTypes.STRING(100), allowNull: true, field: 'embedding_model' },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    isDefault: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_default' },
    maxTokens: { type: DataTypes.INTEGER, allowNull: true, field: 'max_tokens' },
    temperature: { type: DataTypes.DECIMAL(4, 2), allowNull: true },
    timeoutMs: { type: DataTypes.INTEGER, allowNull: true, field: 'timeout_ms' },
    retryCount: { type: DataTypes.INTEGER, allowNull: true, field: 'retry_count' },
    rateLimitPerMinute: { type: DataTypes.INTEGER, allowNull: true, field: 'rate_limit_per_minute' },
    encryptedSecretReference: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'encrypted_secret_reference',
    },
    settingsJson: { type: DataTypes.JSON, allowNull: true, field: 'settings_json' },
  },
  { tableName: 'copilot_provider_configurations', underscored: true }
);

const CopilotPolicy = sequelize.define(
  'CopilotPolicy',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, field: 'company_id' },
    policyKey: { type: DataTypes.STRING(100), allowNull: false, field: 'policy_key' },
    policyType: { type: DataTypes.STRING(50), allowNull: false, field: 'policy_type' },
    module: { type: DataTypes.STRING(100), allowNull: true },
    permissionCode: { type: DataTypes.STRING(150), allowNull: true, field: 'permission_code' },
    rulesJson: { type: DataTypes.JSON, allowNull: true, field: 'rules_json' },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: true, field: 'created_by' },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'updated_by' },
  },
  { tableName: 'copilot_policies', underscored: true }
);

function wireCopilotAssociations(models) {
  const {
    CopilotConversation: Conv,
    CopilotMessage: Msg,
    CopilotMessageSource: Src,
    CopilotDocument: Doc,
    CopilotDocumentChunk: Chunk,
    CopilotFeedback: Fb,
  } = models;

  Conv.hasMany(Msg, { foreignKey: 'conversationId', as: 'messages' });
  Msg.belongsTo(Conv, { foreignKey: 'conversationId', as: 'conversation' });
  Msg.hasMany(Src, { foreignKey: 'messageId', as: 'sources' });
  Src.belongsTo(Msg, { foreignKey: 'messageId', as: 'message' });
  Doc.hasMany(Chunk, { foreignKey: 'documentId', as: 'chunks' });
  Chunk.belongsTo(Doc, { foreignKey: 'documentId', as: 'document' });
  Msg.hasMany(Fb, { foreignKey: 'messageId', as: 'feedback' });
  Fb.belongsTo(Msg, { foreignKey: 'messageId', as: 'message' });
}

module.exports = {
  CopilotConversation,
  CopilotMessage,
  CopilotMessageSource,
  CopilotDocument,
  CopilotDocumentChunk,
  CopilotToolRun,
  CopilotFeedback,
  CopilotPromptVersion,
  CopilotProviderConfiguration,
  CopilotPolicy,
  wireCopilotAssociations,
};
