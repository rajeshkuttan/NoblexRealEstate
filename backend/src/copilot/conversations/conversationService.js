const {
  CopilotConversation,
  CopilotMessage,
  CopilotFeedback,
  AuditLog,
} = require('../../models');
const { Op } = require('sequelize');
const { resolveEntityContext } = require('../context/entityContext');

async function listConversations(companyId, userId) {
  return CopilotConversation.findAll({
    where: {
      companyId,
      userId,
      status: { [Op.ne]: 'deleted' },
    },
    order: [['updatedAt', 'DESC']],
    limit: 50,
  });
}

async function createConversation(companyId, userId, body = {}) {
  const ctx = await resolveEntityContext(companyId, {
    entityType: body.entityType,
    entityId: body.entityId,
    moduleContext: body.moduleContext,
  });

  const defaultTitle = ctx.label
    ? `Ask about ${ctx.entityType} ${ctx.label}`
    : 'New conversation';
  const title = (body.title && String(body.title).trim()) || defaultTitle;

  const conversation = await CopilotConversation.create({
    companyId,
    userId,
    title,
    moduleContext: ctx.moduleContext,
    entityType: ctx.entityType,
    entityId: ctx.entityId,
    language: body.language || 'en',
    status: 'active',
  });

  try {
    await AuditLog.create({
      entityType: 'CopilotConversation',
      entityId: conversation.id,
      action: 'CREATE',
      oldValue: null,
      newValue: {
        companyId,
        userId,
        title,
        entityType: ctx.entityType,
        entityId: ctx.entityId,
      },
      userId,
    });
  } catch (_) {
    /* non-fatal */
  }

  const plain = conversation.toJSON();
  plain.entityLabel = ctx.label;
  plain.entityMeta = ctx.meta;
  return plain;
}

async function getConversation(companyId, userId, conversationId) {
  const conversation = await CopilotConversation.findOne({
    where: { id: conversationId, companyId, userId },
  });
  if (!conversation) return null;
  const messages = await CopilotMessage.findAll({
    where: { conversationId: conversation.id, companyId },
    include: [{ association: 'sources', required: false }],
    order: [['id', 'ASC']],
  });
  const plain = conversation.toJSON();
  plain.messages = messages;
  return plain;
}

async function assertConversationAccess(companyId, userId, conversationId) {
  const conversation = await CopilotConversation.findOne({
    where: { id: conversationId, companyId, userId },
  });
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  return conversation;
}

async function addFeedback(companyId, userId, body) {
  const message = await CopilotMessage.findOne({
    where: { id: body.messageId, companyId },
  });
  if (!message) {
    const err = new Error('Message not found');
    err.status = 404;
    throw err;
  }
  return CopilotFeedback.create({
    companyId,
    messageId: message.id,
    userId,
    rating: body.rating ?? null,
    feedbackType: body.feedbackType || null,
    comment: body.comment || null,
    expectedAnswer: body.expectedAnswer || null,
  });
}

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  assertConversationAccess,
  addFeedback,
};
