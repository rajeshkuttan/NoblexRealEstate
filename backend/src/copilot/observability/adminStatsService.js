'use strict';

const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const {
  CopilotConversation,
  CopilotMessage,
  CopilotDocument,
  CopilotToolRun,
  CopilotFeedback,
} = require('../../models');
const { startOfUtcDay, startOfUtcMonth } = require('./quotaService');
const { getCopilotConfig } = require('../config/copilotConfig');
const { estimateCostUsd } = require('./costEstimator');
const { PROMPT_VERSION } = require('../prompts/promptRegistry');
const { getRetrievalMode } = require('../retrieval');

async function sumTokens(companyId, since) {
  const [[row]] = await sequelize.query(
    `SELECT
       COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
       COALESCE(SUM(completion_tokens), 0) AS completionTokens,
       COALESCE(SUM(total_tokens), 0) AS totalTokens
     FROM copilot_messages
     WHERE company_id = :companyId
       AND role = 'assistant'
       AND created_at >= :since`,
    { replacements: { companyId, since } }
  );
  return {
    promptTokens: Number(row?.promptTokens ?? row?.prompttokens ?? 0),
    completionTokens: Number(row?.completionTokens ?? row?.completiontokens ?? 0),
    totalTokens: Number(row?.totalTokens ?? row?.totaltokens ?? 0),
  };
}

async function getAdminStats(companyId) {
  const dayStart = startOfUtcDay();
  const monthStart = startOfUtcMonth();
  const cfg = getCopilotConfig();

  const [
    conversations,
    messagesToday,
    messagesMonth,
    documents,
    documentsReady,
    documentsFailed,
    toolRunsToday,
    toolDeniedToday,
    feedbackToday,
    feedbackUp,
    feedbackDown,
    tokensToday,
    tokensMonth,
  ] = await Promise.all([
    CopilotConversation.count({ where: { companyId, status: { [Op.ne]: 'deleted' } } }),
    CopilotMessage.count({
      where: { companyId, role: 'user', createdAt: { [Op.gte]: dayStart } },
    }),
    CopilotMessage.count({
      where: { companyId, role: 'user', createdAt: { [Op.gte]: monthStart } },
    }),
    CopilotDocument.count({ where: { companyId } }),
    CopilotDocument.count({ where: { companyId, ingestionStatus: 'ready' } }),
    CopilotDocument.count({ where: { companyId, ingestionStatus: 'failed' } }),
    CopilotToolRun.count({
      where: { companyId, createdAt: { [Op.gte]: dayStart } },
    }),
    CopilotToolRun.count({
      where: { companyId, status: 'denied', createdAt: { [Op.gte]: dayStart } },
    }),
    CopilotFeedback.count({
      where: { companyId, createdAt: { [Op.gte]: dayStart } },
    }),
    CopilotFeedback.count({
      where: { companyId, rating: { [Op.gt]: 0 }, createdAt: { [Op.gte]: dayStart } },
    }),
    CopilotFeedback.count({
      where: { companyId, rating: { [Op.lt]: 0 }, createdAt: { [Op.gte]: dayStart } },
    }),
    sumTokens(companyId, dayStart),
    sumTokens(companyId, monthStart),
  ]);

  const estimatedCostTodayUsd = estimateCostUsd({
    promptTokens: tokensToday.promptTokens,
    completionTokens: tokensToday.completionTokens,
  });
  const estimatedCostMonthUsd = estimateCostUsd({
    promptTokens: tokensMonth.promptTokens,
    completionTokens: tokensMonth.completionTokens,
  });

  return {
    conversations,
    messagesToday,
    messagesMonth,
    documents: { total: documents, ready: documentsReady, failed: documentsFailed },
    toolRunsToday,
    toolDeniedToday,
    feedback: {
      today: feedbackToday,
      upToday: feedbackUp,
      downToday: feedbackDown,
    },
    usage: {
      tokensToday: tokensToday.totalTokens,
      tokensMonth: tokensMonth.totalTokens,
      promptTokensToday: tokensToday.promptTokens,
      completionTokensToday: tokensToday.completionTokens,
      estimatedCostTodayUsd,
      estimatedCostMonthUsd,
    },
    promptVersion: PROMPT_VERSION,
    quotas: {
      userDailyMessageQuota: cfg.userDailyMessageQuota,
      companyMonthlyMessageQuota: cfg.companyMonthlyMessageQuota,
    },
    retrievalMode: getRetrievalMode(),
    phase: 8,
  };
}

module.exports = { getAdminStats };
