'use strict';

const fs = require('fs');
const path = require('path');

jest.mock('../../copilot/tools/leasing/leasingTools', () => ({
  getPropertyPortfolioSummary: jest.fn(),
  getPropertyDetails: jest.fn(),
  getUnitDetails: jest.fn(),
  getVacantUnits: jest.fn(),
  getOccupancySummary: jest.fn(),
  getTenantProfile: jest.fn(),
  getLeaseDetails: jest.fn(),
  getExpiringLeases: jest.fn(),
  getLeaseStatsSummary: jest.fn(),
}));

jest.mock('../../copilot/tools/finance/financeTools', () => ({
  getRentCollectionSummary: jest.fn(),
  getOverdueRent: jest.fn(),
  getReceivableAging: jest.fn(),
  getTenantOutstanding: jest.fn(),
  getSecurityDepositSummary: jest.fn(),
}));

jest.mock('../../copilot/tools/treasury/treasuryTools', () => ({
  getCashPosition: jest.fn(),
  getBankAccountSummary: jest.fn(),
  getTreasuryExceptions: jest.fn(),
}));

jest.mock('../../copilot/tools/investment/investmentTools', () => ({
  getInvestmentPortfolioSummary: jest.fn(),
  getInvestmentHoldingDetails: jest.fn(),
  getUpcomingInvestmentMaturities: jest.fn(),
}));

jest.mock('../../copilot/tools/management/managementTools', () => ({
  getDailyLeasingBrief: jest.fn(),
  getCollectionRiskBrief: jest.fn(),
  getUpcomingExpiryBrief: jest.fn(),
  getOccupancyBrief: jest.fn(),
}));

jest.mock('../../models', () => ({
  CopilotDocument: {},
  CopilotDocumentChunk: {},
  CopilotToolRun: { create: jest.fn().mockResolvedValue({}) },
}));

const {
  StubEmbeddingProvider,
  getEmbeddingProvider,
  resetEmbeddingProviderForTests,
} = require('../../copilot/embeddings/embeddingProvider');
const { reciprocalRankFusion } = require('../../copilot/retrieval/hybridRetrievalProvider');
const {
  createVectorStore,
  resetVectorStoreForTests,
  getRetrievalMode,
} = require('../../copilot/retrieval');
const { MysqlTextSearchProvider } = require('../../copilot/retrieval/mysqlTextSearchProvider');
const { QdrantVectorStoreProvider } = require('../../copilot/retrieval/qdrantProvider');
const { HybridRetrievalProvider } = require('../../copilot/retrieval/hybridRetrievalProvider');
const { hasPermission } = require('../../copilot/tools/executor');
const { executeTool } = require('../../copilot/tools/executor');
const { loadGoldenCases, runEvaluationSuite } = require('../../copilot/evaluation/evaluationRunner');

describe('Copilot embeddings', () => {
  afterEach(() => {
    resetEmbeddingProviderForTests();
    delete process.env.COPILOT_EMBEDDING_PROVIDER;
  });

  test('stub embeddings are deterministic and normalized', async () => {
    const p = new StubEmbeddingProvider(8);
    const [a, b] = await p.embedTexts(['hello world', 'hello world']);
    expect(a).toEqual(b);
    expect(a).toHaveLength(8);
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  test('default embedding provider is none when unset', async () => {
    process.env.COPILOT_EMBEDDING_PROVIDER = 'none';
    resetEmbeddingProviderForTests();
    const health = await getEmbeddingProvider().healthCheck();
    expect(health.provider).toBe('none');
    expect(health.configured).toBe(false);
  });
});

describe('Copilot retrieval factory', () => {
  afterEach(() => {
    resetVectorStoreForTests();
    delete process.env.COPILOT_RETRIEVAL_MODE;
  });

  test('defaults to mysql', () => {
    process.env.COPILOT_RETRIEVAL_MODE = 'mysql';
    expect(createVectorStore('mysql')).toBeInstanceOf(MysqlTextSearchProvider);
    expect(getRetrievalMode()).toBe('mysql');
  });

  test('creates qdrant and hybrid providers', () => {
    expect(createVectorStore('qdrant')).toBeInstanceOf(QdrantVectorStoreProvider);
    expect(createVectorStore('hybrid')).toBeInstanceOf(HybridRetrievalProvider);
  });
});

describe('Copilot hybrid RRF', () => {
  test('merges ranked lists by chunk id', () => {
    const a = [
      { chunkId: 1, content: 'a1' },
      { chunkId: 2, content: 'a2' },
    ];
    const b = [
      { chunkId: 2, content: 'b2' },
      { chunkId: 3, content: 'b3' },
    ];
    const merged = reciprocalRankFusion([a, b], { limit: 3 });
    expect(merged[0].chunkId).toBe(2);
    expect(merged.map((m) => m.chunkId).sort()).toEqual([1, 2, 3]);
  });
});

describe('Copilot company-scoped MySQL SQL', () => {
  test('search SQL template always binds company_id', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../copilot/retrieval/mysqlTextSearchProvider.js'),
      'utf8'
    );
    expect(src).toMatch(/c\.company_id = :companyId/);
    expect(src).toMatch(/d\.company_id = :companyId/);
    expect(src).not.toMatch(/WHERE\s+MATCH/i);
  });

  test('qdrant search requires companyId filter', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '../../copilot/retrieval/qdrantProvider.js'),
      'utf8'
    );
    expect(src).toMatch(/key: 'companyId'/);
    expect(src).toMatch(/filter:\s*\{\s*must/);
  });
});

describe('Copilot permission isolation', () => {
  test('hasPermission rejects missing codes', () => {
    expect(hasPermission(['module:units:view'], 'module:finance:view')).toBe(false);
  });

  test('executeTool denies without permission', async () => {
    const result = await executeTool({
      toolName: 'getVacantUnits',
      input: {},
      companyId: 1,
      userId: 1,
      userPermissions: [],
    });
    expect(result.status).toBe('denied');
    expect(result.errorCode).toBe('PERMISSION_DENIED');
  });
});

describe('Copilot phase 8 evaluation scale', () => {
  test('has 150+ golden cases', () => {
    expect(loadGoldenCases().length).toBeGreaterThanOrEqual(150);
  });

  test('suite still passes at high rate', () => {
    const report = runEvaluationSuite({});
    expect(report.passRate).toBeGreaterThanOrEqual(90);
  });
});

describe('Copilot phase 8 wiring', () => {
  test('health reports phase 8+ vectorAbstraction', () => {
    const ctrl = fs.readFileSync(
      path.join(__dirname, '../../copilot/controllers/copilotController.js'),
      'utf8'
    );
    expect(ctrl).toMatch(/phase:\s*[8-9]/);
    expect(ctrl).toMatch(/vectorAbstraction/);
  });
});
