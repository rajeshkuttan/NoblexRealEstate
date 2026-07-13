'use strict';

const {
  detectTicketIntent,
  proposeCreateHelpdeskTicket,
} = require('../../copilot/actions/helpdeskTicketAction');
const {
  detectCollectionNoticeIntent,
  proposePrepareCollectionNotice,
} = require('../../copilot/actions/collectionNoticeAction');
const {
  createPendingAction,
  consumePendingAction,
  clearAllForTests,
} = require('../../copilot/actions/pendingActionStore');
const { getCopilotConfig } = require('../../copilot/config/copilotConfig');
const { streamChat, completeChat } = require('../../copilot/providers/llmProvider');

describe('Copilot Phase 4 controlled actions', () => {
  beforeEach(() => clearAllForTests());

  test('detects create ticket intent', () => {
    const draft = detectTicketIntent('Please create a ticket for plumbing leak in unit 12');
    expect(draft).toBeTruthy();
    expect(draft.category).toBe('plumbing');
  });

  test('ignores non-action questions', () => {
    expect(detectTicketIntent('How many vacant units?')).toBeNull();
  });

  test('proposes pending confirmation with token', () => {
    const result = proposeCreateHelpdeskTicket({
      companyId: 1,
      userId: 2,
      userPermissions: ['module:helpdesk:create'],
      conversationId: 9,
      messageId: 8,
      query: 'Create a helpdesk ticket for AC not working',
    });
    expect(result.status).toBe('pending_confirmation');
    expect(result.confirmationToken).toHaveLength(48);
    expect(result.preview.category).toBe('electrical');
  });

  test('denies without helpdesk create permission', () => {
    const result = proposeCreateHelpdeskTicket({
      companyId: 1,
      userId: 2,
      userPermissions: ['module:copilot:use'],
      conversationId: 9,
      messageId: 8,
      query: 'Create a ticket for cleaning',
    });
    expect(result.status).toBe('denied');
  });

  test('detects collection notice intent', () => {
    const draft = detectCollectionNoticeIntent(
      'Please prepare a collection notice for tenant Ahmed'
    );
    expect(draft).toBeTruthy();
    expect(draft.body).toMatch(/COLLECTION NOTICE/);
  });

  test('proposes collection notice with finance view', () => {
    const result = proposePrepareCollectionNotice({
      companyId: 1,
      userId: 2,
      userPermissions: ['module:finance:view'],
      conversationId: 1,
      messageId: 1,
      query: 'Draft a collection notice for tenant #5',
    });
    expect(result.status).toBe('pending_confirmation');
    expect(result.action).toBe('prepareCollectionNotice');
  });

  test('pending store expires consume', () => {
    const entry = createPendingAction({
      action: 'createHelpdeskTicket',
      companyId: 1,
      userId: 1,
      payload: { title: 'x' },
    });
    const consumed = consumePendingAction(entry.token);
    expect(consumed.payload.title).toBe('x');
    expect(consumePendingAction(entry.token)).toBeNull();
  });
});

describe('Copilot Phase 4 config quotas', () => {
  test('exposes quota defaults', () => {
    const cfg = getCopilotConfig();
    expect(cfg.userDailyMessageQuota).toBeGreaterThan(0);
    expect(cfg.companyMonthlyMessageQuota).toBeGreaterThan(0);
  });
});

describe('Copilot streaming provider stub', () => {
  test('streamChat emits full stub content when unconfigured', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.resetModules();
    const { streamChat: stream } = require('../../copilot/providers/llmProvider');
    const chunks = [];
    const result = await stream({
      messages: [{ role: 'user', content: 'hi' }],
      onDelta: (t) => chunks.push(t),
    });
    expect(result.configured).toBe(false);
    expect(chunks.join('')).toBe(result.content);
    if (prev === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prev;
    jest.resetModules();
  });

  test('completeChat still works', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    jest.resetModules();
    const { completeChat: complete } = require('../../copilot/providers/llmProvider');
    const result = await complete({ messages: [{ role: 'user', content: 'hi' }] });
    expect(result.content).toBeTruthy();
    if (prev === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prev;
    jest.resetModules();
  });
});

describe('Copilot Phase 4 routes wiring', () => {
  const fs = require('fs');
  const path = require('path');
  const routes = fs.readFileSync(
    path.join(__dirname, '../../copilot/routes/copilotRoutes.js'),
    'utf8'
  );

  test('exposes confirm, admin stats, and stream', () => {
    expect(routes).toMatch(/\/actions\/confirm/);
    expect(routes).toMatch(/\/admin\/stats/);
    expect(routes).toMatch(/messages\/stream/);
    expect(routes).toMatch(/module:copilot:admin/);
  });
});
