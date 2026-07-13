/**
 * Copilot configuration from environment.
 */
function isCopilotEnabled() {
  const v = process.env.COPILOT_ENABLED;
  if (v === undefined || v === '') return true;
  return String(v).toLowerCase() !== 'false' && v !== '0';
}

function getAllowedMimeTypes() {
  const raw = process.env.COPILOT_ALLOWED_MIME_TYPES;
  if (raw && String(raw).trim()) {
    return String(raw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [
    'application/pdf',
    'text/plain',
    'text/html',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
}

function getReleaseStage() {
  const raw = String(process.env.COPILOT_RELEASE_STAGE || 'rc1').toLowerCase();
  const allowed = new Set(['off', 'rc1', 'stage1', 'stage2', 'stage3', 'stage4', 'live']);
  return allowed.has(raw) ? raw : 'rc1';
}

/** When false, API process skips indexer/BullMQ workers (use dedicated PM2 worker). Default true. */
function shouldRunWorkers() {
  const v = process.env.COPILOT_RUN_WORKERS;
  if (v === undefined || v === '') return true;
  return String(v).toLowerCase() !== 'false' && v !== '0';
}

function getCopilotConfig() {
  return {
    enabled: isCopilotEnabled(),
    releaseStage: getReleaseStage(),
    runWorkers: shouldRunWorkers(),
    defaultProvider: process.env.COPILOT_DEFAULT_PROVIDER || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    azureApiKey: process.env.AZURE_OPENAI_API_KEY || '',
    azureApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    maxFileSize: parseInt(process.env.COPILOT_MAX_FILE_SIZE, 10) || 10485760,
    allowedMimeTypes: getAllowedMimeTypes(),
    uploadDir: process.env.COPILOT_UPLOAD_DIR || '',
    indexerIntervalMs: parseInt(process.env.COPILOT_INDEXER_INTERVAL_MS, 10) || 5000,
    retrievalLimit: parseInt(process.env.COPILOT_RETRIEVAL_LIMIT, 10) || 6,
    retrievalMode: String(process.env.COPILOT_RETRIEVAL_MODE || 'mysql').toLowerCase(),
    embeddingProvider: String(process.env.COPILOT_EMBEDDING_PROVIDER || 'none').toLowerCase(),
    embeddingModel: process.env.COPILOT_EMBEDDING_MODEL || 'text-embedding-3-small',
    embeddingDims: parseInt(process.env.COPILOT_EMBEDDING_DIMS, 10) || 1536,
    qdrantUrl: process.env.COPILOT_QDRANT_URL || process.env.QDRANT_URL || '',
    qdrantCollection:
      process.env.COPILOT_QDRANT_COLLECTION || process.env.QDRANT_COLLECTION || 'copilot_chunks',
    qdrantApiKey: process.env.COPILOT_QDRANT_API_KEY || process.env.QDRANT_API_KEY || '',
    useBullmq: String(process.env.COPILOT_USE_BULLMQ || '').toLowerCase() === 'true',
    redisUrl: process.env.COPILOT_REDIS_URL || process.env.REDIS_URL || '',
    ocrProvider: String(process.env.COPILOT_OCR_PROVIDER || 'stub').toLowerCase(),
    userDailyMessageQuota: parseInt(process.env.COPILOT_USER_DAILY_MESSAGE_QUOTA, 10) || 200,
    companyMonthlyMessageQuota: parseInt(process.env.COPILOT_COMPANY_MONTHLY_MESSAGE_QUOTA, 10) || 5000,
    actionConfirmTtlMs: parseInt(process.env.COPILOT_ACTION_CONFIRM_TTL_MS, 10) || 10 * 60 * 1000,
  };
}

function isProviderConfigured() {
  const cfg = getCopilotConfig();
  if (cfg.defaultProvider === 'azure') {
    return Boolean(cfg.azureEndpoint && cfg.azureApiKey);
  }
  return Boolean(cfg.openaiApiKey);
}

module.exports = {
  isCopilotEnabled,
  getCopilotConfig,
  isProviderConfigured,
  getAllowedMimeTypes,
  getReleaseStage,
  shouldRunWorkers,
};
