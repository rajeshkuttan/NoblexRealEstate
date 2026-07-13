'use strict';

const { proposeCreateHelpdeskTicket, confirmCreateHelpdeskTicket } = require('./helpdeskTicketAction');
const {
  proposePrepareCollectionNotice,
  confirmPrepareCollectionNotice,
} = require('./collectionNoticeAction');
const {
  proposePrepareFinancePostingDraft,
  confirmPrepareFinancePostingDraft,
} = require('./financePostingDraftAction');
const { getPendingAction } = require('./pendingActionStore');

function proposeControlledAction(ctx) {
  return (
    proposeCreateHelpdeskTicket(ctx) ||
    proposePrepareCollectionNotice(ctx) ||
    proposePrepareFinancePostingDraft(ctx) ||
    null
  );
}

async function confirmControlledAction(ctx) {
  const pending = getPendingAction(ctx.token);
  if (!pending) {
    return {
      status: 'failed',
      errorCode: 'INVALID_OR_EXPIRED_TOKEN',
      summary: 'Confirmation token invalid or expired.',
    };
  }
  if (pending.action === 'createHelpdeskTicket') {
    return confirmCreateHelpdeskTicket(ctx);
  }
  if (pending.action === 'prepareCollectionNotice') {
    return confirmPrepareCollectionNotice(ctx);
  }
  if (pending.action === 'prepareFinancePostingDraft') {
    return confirmPrepareFinancePostingDraft(ctx);
  }
  return {
    status: 'failed',
    errorCode: 'UNKNOWN_ACTION',
    summary: `Unknown action: ${pending.action}`,
  };
}

module.exports = {
  proposeControlledAction,
  confirmControlledAction,
};
