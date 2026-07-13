'use strict';

const { Ticket, CopilotToolRun } = require('../../models');
const { createPendingAction, consumePendingAction } = require('./pendingActionStore');
const { hasPermission } = require('../tools/executor');

const ACTION_NAME = 'createHelpdeskTicket';
const REQUIRED_PERMISSION = 'module:helpdesk:create';

function detectTicketIntent(query) {
  const q = String(query || '').toLowerCase();
  if (!/\b(create|open|raise|log)\b/.test(q)) return null;
  if (!/\b(ticket|helpdesk|maintenance request|work order)\b/.test(q)) return null;

  let priority = 'medium';
  if (/\b(urgent|emergency)\b/.test(q)) priority = 'urgent';
  else if (/\bhigh\b/.test(q)) priority = 'high';
  else if (/\blow\b/.test(q)) priority = 'low';

  let category = 'general';
  if (/\b(plumb|water|leak)\b/.test(q)) category = 'plumbing';
  else if (/\b(electr|ac|hvac|air.?con)\b/.test(q)) category = 'electrical';
  else if (/\b(clean)\b/.test(q)) category = 'cleaning';
  else if (/\b(maint)\b/.test(q)) category = 'maintenance';

  const titleMatch = q.match(/(?:ticket|request)\s+(?:for|about)\s+(.+)$/i);
  const title =
    (titleMatch && titleMatch[1].trim().slice(0, 180)) ||
    String(query).trim().slice(0, 180) ||
    'Copilot helpdesk request';

  return {
    title,
    description: String(query).trim().slice(0, 4000),
    category,
    priority,
  };
}

/**
 * Propose a helpdesk ticket — never creates until confirmed.
 */
function proposeCreateHelpdeskTicket({
  companyId,
  userId,
  userPermissions,
  conversationId,
  messageId,
  query,
}) {
  const draft = detectTicketIntent(query);
  if (!draft) return null;

  if (!hasPermission(userPermissions, REQUIRED_PERMISSION)) {
    return {
      status: 'denied',
      errorCode: 'PERMISSION_DENIED',
      summary: `Missing permission ${REQUIRED_PERMISSION}`,
    };
  }

  const pending = createPendingAction({
    action: ACTION_NAME,
    companyId,
    userId,
    conversationId,
    messageId,
    requiredPermission: REQUIRED_PERMISSION,
    payload: draft,
  });

  return {
    status: 'pending_confirmation',
    action: ACTION_NAME,
    confirmationToken: pending.token,
    expiresAt: new Date(pending.expiresAt).toISOString(),
    preview: draft,
    summary: 'Confirm to create a helpdesk ticket with the preview details.',
  };
}

async function confirmCreateHelpdeskTicket({
  token,
  companyId,
  userId,
  userPermissions,
  reportedBy,
}) {
  const started = Date.now();
  const pending = consumePendingAction(token);
  if (!pending || pending.action !== ACTION_NAME) {
    return { status: 'failed', errorCode: 'INVALID_OR_EXPIRED_TOKEN', summary: 'Confirmation token invalid or expired.' };
  }
  if (pending.companyId !== companyId || pending.userId !== userId) {
    return { status: 'denied', errorCode: 'ACTION_OWNERSHIP_MISMATCH', summary: 'Confirmation does not belong to this user/company.' };
  }
  if (!hasPermission(userPermissions, REQUIRED_PERMISSION)) {
    return { status: 'denied', errorCode: 'PERMISSION_DENIED', summary: `Missing permission ${REQUIRED_PERMISSION}` };
  }

  const draft = pending.payload || {};
  const count = await Ticket.count();
  const ticketNumber = `TKT-AI-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  const ticket = await Ticket.create({
    ticketNumber,
    title: String(draft.title || 'Copilot ticket').slice(0, 200),
    description: String(draft.description || draft.title || 'Created via Copilot'),
    category: draft.category || 'general',
    priority: draft.priority || 'medium',
    status: 'open',
    reportedBy: reportedBy || `user:${userId}`,
    isActive: true,
  });

  await CopilotToolRun.create({
    companyId,
    conversationId: pending.conversationId,
    messageId: pending.messageId,
    userId,
    toolName: ACTION_NAME,
    module: 'helpdesk',
    inputJson: draft,
    outputSummary: JSON.stringify({ id: ticket.id, ticketNumber: ticket.ticketNumber }).slice(0, 1500),
    outputRecordCount: 1,
    permissionCode: REQUIRED_PERMISSION,
    status: 'success',
    latencyMs: Date.now() - started,
  }).catch(() => {});

  return {
    status: 'success',
    action: ACTION_NAME,
    data: {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
    },
    summary: `Created ticket ${ticket.ticketNumber}`,
  };
}

module.exports = {
  ACTION_NAME,
  REQUIRED_PERMISSION,
  detectTicketIntent,
  proposeCreateHelpdeskTicket,
  confirmCreateHelpdeskTicket,
};
