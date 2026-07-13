const conversationService = require('../conversations/conversationService');
const documentService = require('../ingestion/documentService');
const { handleUserMessage } = require('../orchestrator/copilotOrchestrator');
const { isCopilotEnabled, isProviderConfigured, getCopilotConfig } = require('../config/copilotConfig');
const { getVectorStore, getRetrievalMode } = require('../retrieval');
const { getEmbeddingProvider } = require('../embeddings/embeddingProvider');
const { tick } = require('../ingestion/indexerWorker');

function disabledResponse(res) {
  return res.status(503).json({
    success: false,
    code: 'COPILOT_DISABLED',
    message: 'Copilot is disabled for this environment (COPILOT_ENABLED=false).',
  });
}

function requireEnabled(req, res, next) {
  if (!isCopilotEnabled()) return disabledResponse(res);
  return next();
}

async function health(req, res) {
  const cfg = getCopilotConfig();
  const {
    probeMysql,
    probeRedis,
    probeQdrant,
    probeFileStorage,
    probeCopilotWorker,
    buildLlmDependency,
  } = require('../observability/dependencyHealth');
  const { sequelize } = require('../../config/database');

  let retrieval = { ok: false };
  let embeddings = { ok: false };
  let queueHealth = { ok: true, provider: 'inprocess' };
  let ocrHealth = { ok: true, provider: cfg.ocrProvider };
  let mysqlDep = { ok: false };
  let redisDep = { ok: false };
  let qdrantDep = { ok: false };
  try {
    retrieval = await getVectorStore().healthCheck();
  } catch (_) {
    /* ignore */
  }
  try {
    embeddings = await getEmbeddingProvider().healthCheck();
  } catch (_) {
    /* ignore */
  }
  try {
    queueHealth = await require('../ingestion/ingestQueue').healthCheck();
  } catch (_) {
    /* ignore */
  }
  try {
    ocrHealth = await require('../ingestion/ocrProvider').getOcrProvider().healthCheck();
  } catch (_) {
    /* ignore */
  }
  try {
    mysqlDep = await probeMysql(sequelize);
  } catch (_) {
    /* ignore */
  }
  try {
    redisDep = await probeRedis(cfg.redisUrl);
  } catch (_) {
    /* ignore */
  }
  try {
    qdrantDep = await probeQdrant(cfg.qdrantUrl, cfg.qdrantApiKey);
  } catch (_) {
    /* ignore */
  }
  let breaker = { state: 'closed' };
  try {
    breaker = require('../providers/circuitBreaker').llmBreaker.status();
  } catch (_) {
    /* ignore */
  }
  const llmDep = buildLlmDependency(breaker);
  const fileStorage = probeFileStorage();
  const copilotWorker = probeCopilotWorker(queueHealth);
  const bullmqRequired = cfg.useBullmq;
  const bullmqDep = {
    ok: !bullmqRequired || Boolean(queueHealth.redis),
    status: !bullmqRequired ? 'skipped' : queueHealth.redis ? 'ok' : 'fail',
    queue: queueHealth.queue || 'copilot-ingest',
    provider: queueHealth.provider,
    connected: Boolean(queueHealth.redis),
    required: bullmqRequired,
    lastCheckedAt: new Date().toISOString(),
    latencyMs: 0,
    error: bullmqRequired && !queueHealth.redis ? 'Redis unavailable for BullMQ' : undefined,
  };
  const embeddingsDep = {
    ...(typeof embeddings === 'object' ? embeddings : { ok: Boolean(embeddings) }),
    required: ['hybrid', 'qdrant'].includes(cfg.retrievalMode),
    lastCheckedAt: new Date().toISOString(),
  };
  const ocrDep = {
    ...(typeof ocrHealth === 'object' ? ocrHealth : { ok: true }),
    required: false,
    lastCheckedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: {
      enabled: cfg.enabled,
      providerConfigured: isProviderConfigured(),
      defaultProvider: cfg.defaultProvider,
      phase: 9,
      releaseStage: cfg.releaseStage,
      documentRag: true,
      erpTools: true,
      controlledActions: true,
      streaming: true,
      evaluation: true,
      contextual: true,
      managementBriefs: true,
      adminObservability: true,
      arabicIntent: true,
      vectorAbstraction: true,
      ocr: true,
      queue: true,
      redaction: true,
      circuitBreaker: true,
      promptVersion: require('../prompts/promptRegistry').PROMPT_VERSION,
      toolDomains: [
        'leasing',
        'finance',
        'treasury',
        'investment',
        'management',
        'helpdesk-actions',
        'finance-approval-draft',
      ],
      vectorStore: retrieval,
      embeddings,
      dependencies: {
        mysql: mysqlDep,
        redis: redisDep,
        bullmq: bullmqDep,
        qdrant: qdrantDep,
        llm: llmDep,
        embeddings: embeddingsDep,
        copilotWorker,
        ocr: ocrDep,
        fileStorage,
      },
      retrievalMode: getRetrievalMode(),
      quotas: {
        userDailyMessageQuota: cfg.userDailyMessageQuota,
        companyMonthlyMessageQuota: cfg.companyMonthlyMessageQuota,
      },
    },
  });
}

async function listConversations(req, res) {
  try {
    const data = await conversationService.listConversations(req.companyId, req.user.id);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

async function createConversation(req, res) {
  try {
    const data = await conversationService.createConversation(req.companyId, req.user.id, req.body || {});
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

async function getConversation(req, res) {
  try {
    const data = await conversationService.getConversation(
      req.companyId,
      req.user.id,
      Number(req.params.id)
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
}

async function postMessage(req, res) {
  try {
    const content = req.body?.content;
    if (!content || !String(content).trim()) {
      return res.status(400).json({ success: false, message: 'content is required' });
    }
    const data = await handleUserMessage({
      companyId: req.companyId,
      userId: req.user.id,
      conversationId: Number(req.params.id),
      content,
      userPermissions: req.userPermissions || [],
    });
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({
      success: false,
      code: e.code || undefined,
      message: e.message,
      usage: e.usage || undefined,
    });
  }
}

async function postMessageStream(req, res) {
  const content = req.body?.content;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ success: false, message: 'content is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const writeEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    await handleUserMessage({
      companyId: req.companyId,
      userId: req.user.id,
      conversationId: Number(req.params.id),
      content,
      userPermissions: req.userPermissions || [],
      emit: writeEvent,
    });
  } catch (e) {
    writeEvent('error', {
      code: e.code || 'STREAM_ERROR',
      message: e.message,
      usage: e.usage || undefined,
      status: e.status || 500,
    });
  } finally {
    res.end();
  }
}

async function postFeedback(req, res) {
  try {
    if (!req.body?.messageId) {
      return res.status(400).json({ success: false, message: 'messageId is required' });
    }
    const data = await conversationService.addFeedback(req.companyId, req.user.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
}

async function listDocuments(req, res) {
  try {
    const data = await documentService.listDocuments(req.companyId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

async function getDocument(req, res) {
  try {
    const data = await documentService.getDocument(req.companyId, Number(req.params.id));
    if (!data) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
}

async function uploadDocument(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, code: 'FILE_REQUIRED', message: 'file is required' });
    }
    const result = await documentService.createFromUpload(req.companyId, req.user.id, req.file, {
      title: req.body?.title,
      module: req.body?.module,
      entityType: req.body?.entityType,
      entityId: req.body?.entityId ? Number(req.body.entityId) : null,
      documentType: req.body?.documentType,
      language: req.body?.language,
    });
    // Kick indexer promptly
    void tick();
    res.status(result.duplicate ? 200 : 201).json({
      success: true,
      duplicate: result.duplicate,
      data: result.document,
    });
  } catch (e) {
    res.status(e.status || 400).json({
      success: false,
      code: e.code || 'UPLOAD_FAILED',
      message: e.message,
    });
  }
}

async function reindexDocument(req, res) {
  try {
    const data = await documentService.reindexDocument(req.companyId, Number(req.params.id));
    void tick();
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
}

async function deleteDocument(req, res) {
  try {
    const data = await documentService.deleteDocument(req.companyId, Number(req.params.id));
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
}

async function confirmAction(req, res) {
  try {
    const token = req.body?.confirmationToken || req.body?.token;
    if (!token) {
      return res.status(400).json({ success: false, message: 'confirmationToken is required' });
    }
    const { confirmControlledAction } = require('../actions/actionRouter');
    const data = await confirmControlledAction({
      token,
      companyId: req.companyId,
      userId: req.user.id,
      userPermissions: req.userPermissions || [],
      reportedBy: req.user?.email || req.user?.name || `user:${req.user.id}`,
    });
    const status = data.status === 'success' ? 201 : data.status === 'denied' ? 403 : 400;
    res.status(status).json({ success: data.status === 'success', data });
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
}

async function exportAnswerPdf(req, res) {
  try {
    const { exportAnswerPdf: run } = require('../actions/exportService');
    const conversationId = Number(req.body?.conversationId);
    const messageId = Number(req.body?.messageId);
    if (!conversationId || !messageId) {
      return res.status(400).json({ success: false, message: 'conversationId and messageId required' });
    }
    const file = await run({
      companyId: req.companyId,
      userId: req.user.id,
      userName: req.user?.email || req.user?.name,
      conversationId,
      messageId,
    });
    res.download(file.filePath, file.fileName);
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
}

async function exportToolXlsx(req, res) {
  try {
    const { exportToolXlsx: run } = require('../actions/exportService');
    const conversationId = Number(req.body?.conversationId);
    const messageId = Number(req.body?.messageId);
    if (!conversationId || !messageId) {
      return res.status(400).json({ success: false, message: 'conversationId and messageId required' });
    }
    const file = await run({
      companyId: req.companyId,
      userId: req.user.id,
      conversationId,
      messageId,
      toolName: req.body?.toolName || null,
    });
    res.download(file.filePath, file.fileName);
  } catch (e) {
    res.status(e.status || 400).json({ success: false, message: e.message });
  }
}

async function adminStats(req, res) {
  try {
    const { getAdminStats } = require('../observability/adminStatsService');
    const data = await getAdminStats(req.companyId);
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

async function resolveContext(req, res) {
  try {
    const { resolveEntityContext } = require('../context/entityContext');
    const data = await resolveEntityContext(req.companyId, {
      entityType: req.query.entityType || req.body?.entityType,
      entityId: req.query.entityId || req.body?.entityId,
      moduleContext: req.query.module || req.body?.moduleContext,
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(e.status || 400).json({
      success: false,
      code: e.code || undefined,
      message: e.message,
    });
  }
}

async function listEvaluationCases(req, res) {
  try {
    const { loadGoldenCases } = require('../evaluation/evaluationRunner');
    res.json({ success: true, data: loadGoldenCases() });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

async function runEvaluations(req, res) {
  try {
    const { runEvaluationSuite } = require('../evaluation/evaluationRunner');
    const data = runEvaluationSuite({
      category: req.body?.category || req.query.category || null,
      userPermissions: req.userPermissions || [],
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
}

module.exports = {
  requireEnabled,
  health,
  listConversations,
  createConversation,
  getConversation,
  postMessage,
  postFeedback,
  listDocuments,
  getDocument,
  uploadDocument,
  reindexDocument,
  deleteDocument,
  confirmAction,
  exportAnswerPdf,
  exportToolXlsx,
  adminStats,
  postMessageStream,
  resolveContext,
  listEvaluationCases,
  runEvaluations,
};
