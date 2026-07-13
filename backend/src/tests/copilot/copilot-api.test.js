'use strict';

const express = require('express');
const request = require('supertest');

let mockAuthenticated = true;
let mockPermissions = [];
let mockCompanyId = 1;

jest.mock('../../middleware/authMiddleware', () => ({
  authMiddleware: (req, res, next) => {
    if (!mockAuthenticated) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }
    req.user = { id: 1, isActive: true };
    req.userPermissions = mockPermissions;
    next();
  },
  requirePermission: (code) => (req, res, next) => {
    if (!mockPermissions.includes(code)) {
      return res.status(403).json({ success: false, message: `Permission denied: ${code}` });
    }
    next();
  },
  requireAnyPermission: (codes = []) => (req, res, next) => {
    if (!codes.some((c) => mockPermissions.includes(c))) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  },
}));

jest.mock('../../middleware/resolveCompanyContext', () => ({
  resolveCompanyContext: (req, res, next) => {
    req.companyId = mockCompanyId;
    req.company = { id: mockCompanyId, name: 'Test Co' };
    next();
  },
}));

jest.mock('../../copilot/conversations/conversationService', () => ({
  listConversations: jest.fn(async (companyId, userId) => [
    { id: 10, companyId, userId, title: 'Chat' },
  ]),
  createConversation: jest.fn(async (companyId, userId, body) => ({
    id: 11,
    companyId,
    userId,
    title: body.title || 'New conversation',
  })),
  getConversation: jest.fn(async (companyId, userId, id) => {
    if (companyId !== 1 || userId !== 1) return null;
    if (id === 999) return null;
    return {
      id,
      companyId,
      userId,
      title: 'Chat',
      messages: [{ id: 1, role: 'user', content: 'hi' }],
    };
  }),
  addFeedback: jest.fn(async () => ({ id: 1, rating: 1 })),
  assertConversationAccess: jest.fn(),
}));

jest.mock('../../copilot/orchestrator/copilotOrchestrator', () => ({
  handleUserMessage: jest.fn(async ({ companyId, conversationId, content }) => ({
    userMessage: { id: 1, role: 'user', content, companyId, conversationId },
    assistantMessage: {
      id: 2,
      role: 'assistant',
      content: 'Provider is not configured.',
      responseType: 'text',
      companyId,
      conversationId,
    },
    sources: [],
  })),
}));

jest.mock('../../copilot/ingestion/documentService', () => ({
  listDocuments: jest.fn(async () => []),
  getDocument: jest.fn(async () => null),
  createFromUpload: jest.fn(),
  reindexDocument: jest.fn(),
  deleteDocument: jest.fn(),
  resolveUploadRoot: jest.fn(() => require('path').join(__dirname, 'tmp-copilot')),
}));

jest.mock('../../copilot/ingestion/indexerWorker', () => ({
  tick: jest.fn(),
  startIndexerWorker: jest.fn(),
  stopIndexerWorker: jest.fn(),
}));

jest.mock('../../copilot/retrieval/mysqlTextSearchProvider', () => ({
  getVectorStore: () => ({
    healthCheck: async () => ({ ok: true, provider: 'mysql-text' }),
    search: async () => [],
  }),
}));

const { isCopilotEnabled } = require('../../copilot/config/copilotConfig');
const conversationService = require('../../copilot/conversations/conversationService');
const { handleUserMessage } = require('../../copilot/orchestrator/copilotOrchestrator');
const copilotRoutes = require('../../copilot/routes/copilotRoutes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/copilot', copilotRoutes);
  return app;
}

describe('Copilot API routes (supertest)', () => {
  const prevEnabled = process.env.COPILOT_ENABLED;

  beforeEach(() => {
    mockAuthenticated = true;
    mockPermissions = ['module:copilot:use'];
    mockCompanyId = 1;
    process.env.COPILOT_ENABLED = 'true';
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (prevEnabled === undefined) delete process.env.COPILOT_ENABLED;
    else process.env.COPILOT_ENABLED = prevEnabled;
  });

  test('returns 401 when unauthenticated', async () => {
    mockAuthenticated = false;
    const res = await request(buildApp()).get('/api/copilot/conversations');
    expect(res.status).toBe(401);
  });

  test('returns 403 without module:copilot:use', async () => {
    mockPermissions = [];
    const res = await request(buildApp()).get('/api/copilot/conversations');
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/module:copilot:use/);
  });

  test('returns 503 when COPILOT_ENABLED=false', async () => {
    process.env.COPILOT_ENABLED = 'false';
    // Config is read at request time via isCopilotEnabled()
    expect(isCopilotEnabled()).toBe(false);
    const res = await request(buildApp()).get('/api/copilot/conversations');
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('COPILOT_DISABLED');
  });

  test('health still works when disabled (reports enabled=false)', async () => {
    process.env.COPILOT_ENABLED = 'false';
    const res = await request(buildApp()).get('/api/copilot/health');
    expect(res.status).toBe(200);
    expect(res.body.data.enabled).toBe(false);
  });

  test('lists conversations scoped to company+user', async () => {
    const res = await request(buildApp()).get('/api/copilot/conversations');
    expect(res.status).toBe(200);
    expect(conversationService.listConversations).toHaveBeenCalledWith(1, 1);
    expect(res.body.data).toHaveLength(1);
  });

  test('create conversation + message round-trip', async () => {
    const create = await request(buildApp())
      .post('/api/copilot/conversations')
      .send({ title: 'Test chat' });
    expect(create.status).toBe(201);
    expect(create.body.data.id).toBe(11);

    const msg = await request(buildApp())
      .post('/api/copilot/conversations/11/messages')
      .send({ content: 'How many vacant units?' });
    expect(msg.status).toBe(201);
    expect(handleUserMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 1,
        userId: 1,
        conversationId: 11,
        content: 'How many vacant units?',
      })
    );
    expect(msg.body.data.assistantMessage.content).toMatch(/not configured/i);
  });

  test('cross-company conversation returns 404', async () => {
    conversationService.getConversation.mockResolvedValueOnce(null);
    const res = await request(buildApp()).get('/api/copilot/conversations/10');
    expect(res.status).toBe(404);
  });
});
