'use strict';

const { CopilotMessage, CopilotMessageSource, AuditLog } = require('../../models');
const { checkUserMessage } = require('../guardrails/policyGuard');
const { completeChat, streamChat } = require('../providers/llmProvider');
const { assertConversationAccess } = require('../conversations/conversationService');
const { logCopilot } = require('../observability/copilotLogger');
const { getVectorStore } = require('../retrieval');
const { executeTool, selectTools } = require('../tools/executor');
const { getCopilotConfig } = require('../config/copilotConfig');
const { checkMessageQuota } = require('../observability/quotaService');
const { proposeControlledAction } = require('../actions/actionRouter');
const { buildContextPromptHint } = require('../context/entityContext');
const { redactSensitive } = require('../guardrails/redaction');

function buildContextBlock(chunks, toolResults) {
  const parts = [];
  if (chunks.length) {
    parts.push('Document context:');
    chunks.forEach((c, i) => {
      const redacted = redactSensitive(String(c.content).slice(0, 1200)).text;
      parts.push(
        `[Doc ${i + 1}] ${c.documentTitle || 'Document'} (chunk ${c.chunkIndex}` +
          `${c.pageNumber != null ? `, page ${c.pageNumber}` : ''}):\n${redacted}`
      );
    });
  }
  if (toolResults.length) {
    parts.push('Live ERP tool results:');
    toolResults.forEach((t) => {
      const raw = JSON.stringify(t.data || t.summary).slice(0, 2000);
      parts.push(`[Tool ${t.toolName} status=${t.status}]\n${redactSensitive(raw).text}`);
    });
  }
  return parts.join('\n\n');
}

function buildFallbackAnswer(chunks, toolResults, configured) {
  if (!configured) {
    const bits = [];
    if (toolResults.some((t) => t.status === 'success')) {
      bits.push('ERP tool data (provider not configured — raw summary):');
      toolResults
        .filter((t) => t.status === 'success')
        .forEach((t) => bits.push(`${t.toolName}: ${JSON.stringify(t.data).slice(0, 800)}`));
    }
    if (chunks.length) {
      bits.push('Retrieved document excerpts:');
      chunks.forEach((c, i) =>
        bits.push(`${i + 1}. ${c.documentTitle}: ${c.contentPreview || String(c.content).slice(0, 200)}`)
      );
    }
    if (bits.length) {
      return (
        'The AI provider is not configured. Showing retrieved context and tool results without model synthesis.\n\n' +
        bits.join('\n')
      );
    }
  }
  return null;
}

function buildActionConfirmText(pendingAction) {
  const actionLabel =
    pendingAction.action === 'prepareCollectionNotice'
      ? 'prepare a collection notice draft'
      : 'create a helpdesk ticket';
  return (
    `I can ${actionLabel}, but need your confirmation.\n\n` +
    `Title: ${pendingAction.preview?.title || ''}\n` +
    `Category: ${pendingAction.preview?.category || ''}\n` +
    `Priority: ${pendingAction.preview?.priority || 'n/a'}\n` +
    (pendingAction.preview?.bodyPreview ? `\nPreview:\n${pendingAction.preview.bodyPreview}\n` : '') +
    `\nConfirm in the UI, or this proposal expires at ${pendingAction.expiresAt}.`
  );
}

async function persistSources({ companyId, assistantMsgId, chunks, toolResults }) {
  const sources = [];
  for (const c of chunks) {
    const row = await CopilotMessageSource.create({
      companyId,
      messageId: assistantMsgId,
      sourceType: 'document',
      documentId: c.documentId,
      documentChunkId: c.chunkId,
      module: 'copilot',
      entityType: 'CopilotDocument',
      entityId: c.documentId,
      sourceLabel: c.documentTitle || `Document ${c.documentId}`,
      pageNumber: c.pageNumber,
      sectionTitle: c.sectionTitle,
      sourceUrl: c.documentId ? `/api/copilot/documents/${c.documentId}` : null,
      relevanceScore: c.score,
      retrievalRank: c.rank,
    });
    const plain = row.toJSON ? row.toJSON() : row;
    plain.contentPreview = c.contentPreview || String(c.content || '').slice(0, 280);
    sources.push(plain);
  }
  for (const t of toolResults.filter((x) => x.status === 'success')) {
    let moduleName = 'leasing';
    const name = t.toolName || '';
    if (name.startsWith('getInvestment') || name.includes('Investment')) moduleName = 'investment';
    else if (name.startsWith('getCash') || name.startsWith('getBank') || name.startsWith('getTreasury')) {
      moduleName = 'treasury';
    } else if (
      name.startsWith('getRent') ||
      name.startsWith('getOverdue') ||
      name.startsWith('getReceivable') ||
      name.startsWith('getTenantOutstanding') ||
      name.startsWith('getSecurity')
    ) {
      moduleName = 'finance';
    }
    const row = await CopilotMessageSource.create({
      companyId,
      messageId: assistantMsgId,
      sourceType: 'tool',
      module: moduleName,
      entityType: 'tool',
      sourceLabel: t.toolName,
      relevanceScore: null,
      retrievalRank: null,
    });
    sources.push(row);
  }
  return sources;
}

/**
 * Persist user message, retrieve docs, run tools, call provider, persist sources.
 * Optional emit(type, payload) enables SSE streaming (delta events).
 */
async function handleUserMessage({
  companyId,
  userId,
  conversationId,
  content,
  userPermissions = [],
  emit = null,
}) {
  const send = (type, data) => {
    if (typeof emit === 'function') emit(type, data);
  };

  const conversation = await assertConversationAccess(companyId, userId, conversationId);
  const started = Date.now();

  const quota = await checkMessageQuota({ companyId, userId });
  if (!quota.ok) {
    const err = new Error(quota.message);
    err.status = 429;
    err.code = quota.code;
    err.usage = quota.usage;
    throw err;
  }

  const guard = checkUserMessage(content);
  const userMsg = await CopilotMessage.create({
    companyId,
    conversationId: conversation.id,
    userId,
    role: 'user',
    content: String(content),
    normalizedQuery: String(content).trim().slice(0, 2000),
    status: guard.allowed ? 'completed' : 'blocked',
    errorCode: guard.allowed ? null : guard.code,
  });
  send('user_message', userMsg);

  if (!guard.allowed) {
    const assistantMsg = await CopilotMessage.create({
      companyId,
      conversationId: conversation.id,
      userId: null,
      role: 'assistant',
      content: guard.reason || 'Message blocked by safety policy.',
      responseType: 'text',
      modelProvider: 'guardrails',
      status: 'blocked',
      errorCode: guard.code,
      latencyMs: Date.now() - started,
    });
    await conversation.update({ updatedAt: new Date() });
    const out = { userMessage: userMsg, assistantMessage: assistantMsg, sources: [] };
    send('done', out);
    return out;
  }

  let chunks = [];
  try {
    chunks = await getVectorStore().search({
      companyId,
      query: content,
      limit: getCopilotConfig().retrievalLimit,
      entityType: conversation.entityType || null,
      entityId: conversation.entityId || null,
    });
  } catch (err) {
    logCopilot('error', 'retrieval_failed', { error: err.message });
  }

  const pendingAction = proposeControlledAction({
    companyId,
    userId,
    userPermissions,
    conversationId: conversation.id,
    messageId: userMsg.id,
    query: content,
  });

  if (pendingAction && pendingAction.status === 'pending_confirmation') {
    const latencyMs = Date.now() - started;
    const confirmText = buildActionConfirmText(pendingAction);
    send('delta', { text: confirmText });
    const assistantMsg = await CopilotMessage.create({
      companyId,
      conversationId: conversation.id,
      userId: null,
      role: 'assistant',
      content: confirmText,
      responseType: 'action_confirmation',
      modelProvider: 'actions',
      latencyMs,
      status: 'completed',
    });
    await conversation.update({ updatedAt: new Date() });
    const plain = assistantMsg.toJSON();
    plain.sources = [];
    plain.pendingAction = pendingAction;
    const out = {
      userMessage: userMsg,
      assistantMessage: plain,
      sources: [],
      pendingAction,
      quotaUsage: quota.usage,
    };
    send('pending_action', pendingAction);
    send('done', out);
    return out;
  }

  const toolCalls = selectTools(content).map((call) => {
    const input = { ...call.input };
    // Inject validated conversation entity into matching tools
    if (conversation.entityType === 'property' && conversation.entityId) {
      if (call.toolName === 'getPropertyDetails' && !input.propertyId) {
        input.propertyId = conversation.entityId;
      }
      if (call.toolName === 'getVacantUnits' && !input.propertyId) {
        input.propertyId = conversation.entityId;
      }
    }
    if (conversation.entityType === 'unit' && conversation.entityId && call.toolName === 'getUnitDetails') {
      if (!input.unitId) input.unitId = conversation.entityId;
    }
    if (conversation.entityType === 'tenant' && conversation.entityId) {
      if (call.toolName === 'getTenantProfile' && !input.tenantId) input.tenantId = conversation.entityId;
      if (call.toolName === 'getTenantOutstanding' && !input.tenantId) input.tenantId = conversation.entityId;
    }
    if (conversation.entityType === 'lease' && conversation.entityId && call.toolName === 'getLeaseDetails') {
      if (!input.leaseId) input.leaseId = conversation.entityId;
    }
    return { ...call, input };
  });
  const toolResults = [];
  if (pendingAction && pendingAction.status === 'denied') {
    toolResults.push({
      toolName: pendingAction.action || 'controlledAction',
      status: 'denied',
      errorCode: pendingAction.errorCode,
      summary: pendingAction.summary,
    });
  }
  for (const call of toolCalls) {
    const result = await executeTool({
      toolName: call.toolName,
      input: call.input,
      companyId,
      userId,
      userPermissions,
      conversationId: conversation.id,
      messageId: userMsg.id,
    });
    toolResults.push(result);
  }

  const prior = await CopilotMessage.findAll({
    where: { conversationId: conversation.id, companyId, status: 'completed' },
    order: [['id', 'ASC']],
    limit: 20,
  });

  const chatMessages = prior
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  const contextBlock = buildContextBlock(chunks, toolResults);
  const entityHint = buildContextPromptHint({
    entityType: conversation.entityType,
    entityId: conversation.entityId,
    label: conversation.title,
  });
  if (contextBlock || entityHint) {
    chatMessages.unshift({
      role: 'system',
      content:
        (entityHint ? `${entityHint}\n\n` : '') +
        (contextBlock
          ? 'Use only the following retrieved document excerpts and ERP tool results. ' +
            'Cite document titles when using document context. If data is missing, say so. Do not invent figures.\n\n' +
            contextBlock
          : 'Prefer the active entity context when answering.'),
    });
  }

  let result;
  if (emit) {
    result = await streamChat({
      messages: chatMessages,
      onDelta: (text) => send('delta', { text }),
    });
  } else {
    result = await completeChat({ messages: chatMessages });
  }

  const fallback = buildFallbackAnswer(chunks, toolResults, result.configured);
  if (fallback && !result.configured) {
    result = { ...result, content: fallback };
    if (emit) send('delta', { text: fallback });
  }

  const latencyMs = Date.now() - started;

  const assistantMsg = await CopilotMessage.create({
    companyId,
    conversationId: conversation.id,
    userId: null,
    role: 'assistant',
    content: result.content,
    responseType: chunks.length || toolResults.length ? 'grounded' : 'text',
    modelProvider: result.modelProvider,
    modelName: result.modelName,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    totalTokens: result.totalTokens,
    latencyMs,
    status: 'completed',
  });

  const sources = await persistSources({
    companyId,
    assistantMsgId: assistantMsg.id,
    chunks,
    toolResults,
  });

  await conversation.update({
    modelProvider: result.modelProvider,
    modelName: result.modelName,
    updatedAt: new Date(),
  });

  try {
    await AuditLog.create({
      entityType: 'CopilotMessage',
      entityId: assistantMsg.id,
      action: 'COPILOT_ASK',
      oldValue: null,
      newValue: {
        companyId,
        conversationId: conversation.id,
        provider: result.modelProvider,
        configured: result.configured,
        chunkCount: chunks.length,
        toolCount: toolResults.length,
        streamed: Boolean(emit),
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        totalTokens: result.totalTokens,
        estimatedCostUsd: result.estimatedCostUsd,
        promptVersion: result.promptVersion,
      },
      userId,
    });
  } catch (err) {
    logCopilot('error', 'audit_failed', { error: err.message });
  }

  const plainAssistant = assistantMsg.toJSON();
  plainAssistant.sources = sources;

  const out = {
    userMessage: userMsg,
    assistantMessage: plainAssistant,
    sources,
    toolResults: toolResults.map((t) => ({
      toolName: t.toolName,
      status: t.status,
      errorCode: t.errorCode || null,
    })),
    quotaUsage: quota.usage,
  };
  send('done', out);
  return out;
}

module.exports = { handleUserMessage };
