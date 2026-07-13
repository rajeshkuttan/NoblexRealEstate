'use strict';

const express = require('express');
const request = require('supertest');

let mockAuthenticated = true;
let mockPermissions = [];

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
}));

jest.mock('../../middleware/resolveCompanyContext', () => ({
  resolveCompanyContext: (req, res, next) => {
    req.companyId = 1;
    req.company = { id: 1, name: 'Test Co' };
    next();
  },
}));

jest.mock('../../controllers/investmentModuleController', () => {
  const wrap = (fn) => async (req, res) => {
    try {
      const data = await fn(req, res);
      res.json({ success: true, data });
    } catch (err) {
      res.status(err.statusCode || 500).json({ success: false, message: err.message });
    }
  };
  return {
    getDashboard: wrap(async () => ({ portfolioValue: 1000 })),
    getPortfolio: wrap(async () => ({ assets: [] })),
    listCategories: wrap(async () => []),
    listTransactions: wrap(async () => ({ transactions: [], total: 0 })),
    getTransactionLedger: wrap(async () => ({ lines: [] })),
    getReportPortfolio: wrap(async () => []),
    postTransaction: wrap(async () => {
      const err = new Error('Transaction already posted');
      err.statusCode = 400;
      throw err;
    }),
    createAsset: wrap(async (req) => ({ id: 1, ...req.body })),
    createTransaction: wrap(async (req) => ({ id: 99, ...req.body })),
    approveTransaction: wrap(async () => ({ approvalStatus: 'APPROVED' })),
    cancelTransaction: wrap(async () => ({ postingStatus: 'CANCELLED' })),
    getAccountSettings: wrap(async () => ({})),
    updateAccountSettings: wrap(async (req) => req.body),
    getAsset: wrap(async () => ({ id: 1 })),
    updateAsset: wrap(async (req) => req.body),
    deleteAsset: wrap(async () => ({ deleted: true })),
    getAssetTransactions: wrap(async () => ({ transactions: [] })),
    getAssetValuations: wrap(async () => []),
    createValuation: wrap(async (req) => req.body),
    approveValuation: wrap(async () => ({ valuation: { id: 1 } })),
    importValuations: wrap(async (req) => ({ created: req.body?.rows || [], errors: [], approved: [] })),
    listDistributions: wrap(async () => []),
    getDistribution: wrap(async () => ({ id: 1, lines: [] })),
    prepareDistribution: wrap(async () => ({ id: 1, distributionNo: 'IDT-0001' })),
    approveDistribution: wrap(async () => ({ approvalStatus: 'APPROVED' })),
    postDistribution: wrap(async () => ({ postingStatus: 'POSTED' })),
    cancelDistribution: wrap(async () => ({ postingStatus: 'CANCELLED' })),
    getAssetAllocations: wrap(async () => []),
    createAllocation: wrap(async (req) => req.body),
    updateAllocation: wrap(async (req) => req.body),
    deleteAllocation: wrap(async () => ({ deleted: true })),
    getReportLedger: wrap(async () => []),
    getReportDividends: wrap(async () => []),
    getReportGainLoss: wrap(async () => []),
    getReportValuations: wrap(async () => []),
    getMonthEndReconciliation: wrap(async () => ({ trialBalance: {}, unpostedApprovedTransactions: [], pendingValuations: [] })),
    getPartnerStatement: wrap(async () => ({ allocations: [], transactions: [] })),
    getValuationProviderSettings: wrap(async () => []),
    updateValuationProviderSettings: wrap(async (req) => req.body),
    uploadDocument: wrap(async () => ({})),
    getAssetDocuments: wrap(async () => []),
    deleteDocument: wrap(async () => ({ deleted: true })),
    createCategory: wrap(async (req) => req.body),
    updateCategory: wrap(async (req) => ({ id: req.params.id, ...req.body })),
    deleteCategory: wrap(async () => ({ deactivated: true })),
    restoreCategory: wrap(async () => ({ id: 1, isActive: true })),
    rejectTransaction: wrap(async () => ({ approvalStatus: 'REJECTED' })),
    listPartners: wrap(async () => [{ investorName: 'Alpha Partner LLC' }]),
    archiveAsset: wrap(async () => ({ id: 1, isArchived: true })),
    restoreAsset: wrap(async () => ({ id: 1, isArchived: false })),
    cloneAsset: wrap(async () => ({ id: 2 })),
    duplicateTransaction: wrap(async () => ({ id: 100 })),
    bulkApproveTransactions: wrap(async () => ({ ok: [], failed: [] })),
    bulkRejectTransactions: wrap(async () => ({ ok: [], failed: [] })),
    bulkPostTransactions: wrap(async () => ({ ok: [], failed: [] })),
    listPortfoliosV2: wrap(async () => ({ portfolios: [], pagination: {} })),
    getPortfolio360: wrap(async () => ({ portfolio: { id: 1 }, holdings: [] })),
    createPortfolioV2: wrap(async (req) => ({ portfolio: { id: 1, ...req.body } })),
    updatePortfolioV2: wrap(async (req) => ({ portfolio: { id: req.params.id, ...req.body } })),
    listInstruments: wrap(async () => ({ instruments: [], pagination: {} })),
    getInstrument360: wrap(async () => ({ instrument: { id: 1 } })),
    createInstrument: wrap(async (req) => ({ instrument: { id: 1, ...req.body } })),
    updateInstrument: wrap(async (req) => ({ instrument: { id: req.params.id } })),
    getInstrumentTypeRules: wrap(async () => ({})),
    listBrokers: wrap(async () => ({ brokers: [] })),
    createBroker: wrap(async (req) => req.body),
    updateBroker: wrap(async (req) => req.body),
    listCustodians: wrap(async () => ({ custodians: [] })),
    createCustodian: wrap(async (req) => req.body),
    updateCustodian: wrap(async (req) => req.body),
    listInvestmentAccounts: wrap(async () => []),
    createInvestmentAccount: wrap(async (req) => req.body),
    runPhase17Migration: wrap(async () => ({ createdInstruments: 0 })),
    listOrders: wrap(async () => ({ orders: [], pagination: {} })),
    getOrder: wrap(async () => ({ id: 1, status: 'DRAFT' })),
    createOrder: wrap(async (req) => ({ id: 1, ...req.body, status: 'DRAFT' })),
    updateOrder: wrap(async (req) => ({ id: req.params.id, ...req.body })),
    submitOrder: wrap(async () => ({ status: 'SUBMITTED' })),
    approveOrder: wrap(async () => ({ status: 'APPROVED' })),
    rejectOrder: wrap(async () => ({ status: 'REJECTED' })),
    placeOrder: wrap(async () => ({ status: 'PLACED' })),
    cancelOrder: wrap(async () => ({ status: 'CANCELLED' })),
    listTrades: wrap(async () => ({ trades: [], pagination: {} })),
    getTrade: wrap(async () => ({ id: 1, status: 'DRAFT' })),
    createTrade: wrap(async (req) => ({ id: 1, ...req.body })),
    confirmTrade: wrap(async () => ({ status: 'CONFIRMED' })),
    cancelTrade: wrap(async () => ({ status: 'CANCELLED' })),
    previewTrade: wrap(async () => ({ valid: true, amounts: { netSettlement: 100 } })),
    listSettlements: wrap(async () => ({ settlements: [], pagination: {} })),
    getSettlement: wrap(async () => ({ id: 1, status: 'PENDING' })),
    settleSettlement: wrap(async () => ({ status: 'SETTLED' })),
    failSettlement: wrap(async () => ({ status: 'FAILED' })),
    cancelSettlement: wrap(async () => ({ status: 'CANCELLED' })),
    listIncomeEvents: wrap(async () => ({ incomeEvents: [], pagination: {} })),
    getIncomeEvent: wrap(async () => ({ event: { id: 1 }, journalPreview: { lines: [] } })),
    createIncomeEvent: wrap(async (req) => ({ id: 1, ...req.body, status: 'EXPECTED' })),
    accrueIncome: wrap(async () => ({ event: { status: 'ACCRUED' } })),
    markIncomeReceivable: wrap(async () => ({ event: { status: 'RECEIVABLE' } })),
    markIncomeReceived: wrap(async () => ({ event: { status: 'RECEIVED' } })),
    reconcileIncome: wrap(async () => ({ reconciled: true })),
    distributeIncome: wrap(async () => ({ event: { status: 'DISTRIBUTED' } })),
    reinvestIncome: wrap(async () => ({ event: { status: 'REINVESTED' } })),
    cancelIncome: wrap(async () => ({ event: { status: 'CANCELLED' } })),
    generateIncomeSchedule: wrap(async () => ({ created: 2, incomeEvents: [] })),
    runIncomeAccruals: wrap(async () => ({ updated: 1 })),
    listCorporateActions: wrap(async () => ({ corporateActions: [], pagination: {} })),
    getCorporateAction: wrap(async () => ({ id: 1, status: 'ANNOUNCED' })),
    createCorporateAction: wrap(async (req) => ({ id: 1, ...req.body })),
    generateEntitlements: wrap(async () => ({ status: 'ENTITLED', entitlements: [] })),
    applyCorporateAction: wrap(async () => ({ status: 'APPLIED' })),
    settleCorporateAction: wrap(async () => ({ status: 'SETTLED' })),
    cancelCorporateAction: wrap(async () => ({ status: 'CANCELLED' })),
    listInvestors: wrap(async () => ({ investors: [], pagination: {} })),
    getInvestor360: wrap(async () => ({ investor: { id: 1, commitments: [] }, currentOwnership: [] })),
    createInvestor: wrap(async (req) => ({ id: 1, ...req.body })),
    updateInvestor: wrap(async (req) => ({ investor: { id: req.params.id } })),
    getPartnerStatementV2: wrap(async () => ({ investorCode: 'X', capitalAccount: null })),
    listCommitments: wrap(async () => ({ commitments: [], pagination: {} })),
    createCommitment: wrap(async (req) => ({ id: 1, ...req.body })),
    listCapitalCalls: wrap(async () => ({ capitalCalls: [], pagination: {} })),
    getCapitalCall: wrap(async () => ({ id: 1, lines: [] })),
    createCapitalCall: wrap(async (req) => ({ id: 1, ...req.body })),
    issueCapitalCall: wrap(async () => ({ status: 'ISSUED' })),
    receiveCapitalCallLine: wrap(async () => ({ status: 'PARTIALLY_FUNDED' })),
    listOwnership: wrap(async () => ({ ownership: [] })),
    setOwnership: wrap(async (req) => ({ id: 1, ...req.body, status: 'ACTIVE' })),
    listCapitalAccounts: wrap(async () => ({ capitalAccounts: [], reconciliation: { balanced: true } })),
    upsertCapitalAccount: wrap(async (req) => ({ id: 1, ...req.body })),
    listDistributionRuns: wrap(async () => ({ distributionRuns: [], pagination: {} })),
    getDistributionRun: wrap(async () => ({ id: 1, lines: [] })),
    createDistributionRun: wrap(async (req) => ({ id: 1, ...req.body, status: 'DRAFT' })),
    calculateDistributionRun: wrap(async () => ({ status: 'CALCULATED', lines: [] })),
    submitDistributionRun: wrap(async () => ({ status: 'UNDER_REVIEW' })),
    approveDistributionRun: wrap(async () => ({ status: 'APPROVED' })),
    payDistributionRun: wrap(async () => ({ status: 'PAID' })),
    reconcileDistributionRun: wrap(async () => ({ status: 'RECONCILED' })),
    issueDistributionStatement: wrap(async () => ({ status: 'STATEMENT_ISSUED' })),
    listMarketPrices: wrap(async () => ({ prices: [], pagination: {} })),
    upsertMarketPrice: wrap(async (req) => ({ id: 1, ...req.body })),
    importMarketPrices: wrap(async () => ({ imported: 1, valid: true, errors: [] })),
    listValuationBatches: wrap(async () => ({ batches: [], pagination: {} })),
    getValuationBatch: wrap(async () => ({ id: 1, lines: [] })),
    createValuationBatch: wrap(async (req) => ({ id: 1, ...req.body, status: 'VALIDATED' })),
    validateValuationBatch: wrap(async () => ({ status: 'VALIDATED' })),
    approveValuationBatch: wrap(async () => ({ status: 'APPROVED' })),
    postValuationBatch: wrap(async () => ({ status: 'POSTED' })),
    fixValuationLine: wrap(async () => ({ status: 'FIXED' })),
    computeNav: wrap(async () => ({ components: { nav: 1000 }, snapshot: { id: 1 } })),
    listNavSnapshots: wrap(async () => ({ snapshots: [] })),
    calculatePerformance: wrap(async () => ({ metrics: { twr: 0.1 }, period: { id: 1 } })),
    listPerformancePeriods: wrap(async () => ({ periods: [] })),
    listBenchmarks: wrap(async () => ({ benchmarks: [] })),
    createBenchmark: wrap(async (req) => ({ id: 1, ...req.body })),
    listReconBatches: wrap(async () => ({ batches: [], pagination: {} })),
    getReconBatch: wrap(async () => ({ id: 1, lines: [], status: 'DRAFT' })),
    createReconBatch: wrap(async (req) => ({ id: 1, ...req.body, status: 'DRAFT' })),
    importReconRows: wrap(async () => ({ id: 1, status: 'IMPORTED', lines: [] })),
    runReconMatch: wrap(async () => ({ id: 1, status: 'MATCHED', lines: [] })),
    resolveReconLine: wrap(async () => ({ id: 1, status: 'MATCHED', lines: [] })),
    approveReconBatch: wrap(async () => ({ id: 1, status: 'APPROVED' })),
    previewReconMatch: wrap(async () => ({ lines: [], summary: { matchedRecords: 0 } })),
    previewManyToOne: wrap(async () => ({ matchStatus: 'MATCHED' })),
    previewOneToMany: wrap(async () => ({ matchStatus: 'MATCHED' })),
    listClosePeriods: wrap(async () => ({ periods: [] })),
    getOrCreateClosePeriod: wrap(async (req) => ({
      period: { id: 1, period: req.body?.period || '2026-07', status: 'OPEN' },
      checklist: [],
      readiness: { ready: false },
    })),
    updateCloseChecklist: wrap(async () => ({ period: { status: 'IN_PROGRESS' }, readiness: { ready: false } })),
    closeInvestmentPeriod: wrap(async () => ({ period: { status: 'CLOSED' } })),
    reopenInvestmentPeriod: wrap(async () => ({ period: { status: 'REOPENED' } })),
    checkPeriodLock: wrap(async () => ({ locked: false })),
    getRiskDashboard: wrap(async () => ({
      concentrations: {},
      openBreaches: [],
      kycExpiries: [],
      staleValuations: [],
      totalMarketValue: 0,
    })),
    previewPreTrade: wrap(async () => ({ passed: true, checks: [], failures: [] })),
    runLimitScan: wrap(async () => ({ evaluations: [], breachesCreated: [] })),
    listMandates: wrap(async () => ({ mandates: [], pagination: {} })),
    getMandate: wrap(async () => ({ id: 1, status: 'DRAFT' })),
    createMandate: wrap(async (req) => ({ id: 1, ...req.body, status: 'DRAFT' })),
    updateMandate: wrap(async (req) => ({ id: req.params.id })),
    activateMandate: wrap(async () => ({ status: 'ACTIVE' })),
    listRiskLimits: wrap(async () => ({ limits: [] })),
    createRiskLimit: wrap(async (req) => ({ id: 1, ...req.body })),
    listBreaches: wrap(async () => ({ breaches: [] })),
    createBreach: wrap(async (req) => ({ id: 1, ...req.body, status: 'OPEN' })),
    overrideBreach: wrap(async () => ({ status: 'EXCEPTION_APPROVED' })),
    listComplianceChecks: wrap(async () => ({ checks: [] })),
    createComplianceCheck: wrap(async (req) => ({ id: 1, ...req.body })),
    updateComplianceCheck: wrap(async () => ({ status: 'PASS' })),
    updateInvestorCompliance: wrap(async () => ({ kycStatus: 'APPROVED' })),
    checkInvestorAllocation: wrap(async () => ({ ok: true })),
    listReportCatalog: wrap(async () => ({ catalog: [], categories: [] })),
    runInvestmentReport: wrap(async () => ({ report: { rows: [] } })),
    listSavedReports: wrap(async () => ({ savedReports: [] })),
    createSavedReport: wrap(async (req) => ({ id: 1, ...req.body })),
    listReportPacks: wrap(async () => ({ packs: [] })),
    createReportPack: wrap(async (req) => ({ id: 1, ...req.body })),
    runReportPack: wrap(async () => ({ reports: [] })),
    listReportSchedules: wrap(async () => ({ schedules: [] })),
    createReportSchedule: wrap(async (req) => ({ id: 1, ...req.body })),
    runDueSchedules: wrap(async () => ({ ran: 0, schedules: [] })),
    listExportHistory: wrap(async () => ({ exports: [], pagination: {} })),
    getExecutiveDashboard: wrap(async () => ({ cards: {}, charts: {} })),
    getInvestmentWorkQueue: wrap(async () => ({ total: 0, items: [], byType: {} })),
    listCopilotTools: wrap(async () => ({ tools: [] })),
    invokeCopilotTool: wrap(async () => ({ grounded: true, data: {} })),
    getInvestmentV2ReleaseStatus: wrap(async () => ({
      enabled: true,
      omsEntryMode: 'pilot',
      legacyEntryMode: 'enabled',
      legacyWritable: true,
      omsWritable: true,
    })),
    listOmsPilotUsers: wrap(async () => ({ pilots: [] })),
    upsertOmsPilotUser: wrap(async (req) => ({ id: 1, userId: req.body.userId, isActive: true })),
    removeOmsPilotUser: wrap(async () => ({ ok: true })),
  };
});

const investmentRoutes = require('../../routes/investmentModuleRoutes');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/investments', investmentRoutes);
  return app;
}

describe('Investment API routes (supertest)', () => {
  beforeEach(() => {
    mockAuthenticated = true;
    mockPermissions = ['module:investment:view'];
  });

  test('returns 401 when unauthenticated', async () => {
    mockAuthenticated = false;
    const res = await request(buildApp()).get('/api/investments/dashboard');
    expect(res.status).toBe(401);
  });

  test('returns 403 without view permission', async () => {
    mockPermissions = [];
    const res = await request(buildApp()).get('/api/investments/dashboard');
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/module:investment:view/);
  });

  test('GET /dashboard succeeds with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.portfolioValue).toBe(1000);
  });

  test('GET /portfolio is company-scoped via middleware', async () => {
    const res = await request(buildApp()).get('/api/investments/portfolio');
    expect(res.status).toBe(200);
    expect(res.body.data.assets).toEqual([]);
  });

  test('POST /assets requires create permission', async () => {
    const res = await request(buildApp())
      .post('/api/investments/assets')
      .send({ investmentName: 'Test' });
    expect(res.status).toBe(403);
  });

  test('POST /assets succeeds with create permission', async () => {
    mockPermissions.push('module:investment:create');
    const res = await request(buildApp())
      .post('/api/investments/assets')
      .send({ investmentName: 'Test ETF' });
    expect(res.status).toBe(200);
    expect(res.body.data.investmentName).toBe('Test ETF');
  });

  test('POST /transactions/:id/post requires post permission', async () => {
    mockPermissions.push('module:investment:approve');
    const res = await request(buildApp()).post('/api/investments/transactions/1/post');
    expect(res.status).toBe(403);
  });

  test('POST /transactions/:id/post returns duplicate guard error', async () => {
    mockPermissions.push('module:investment:post');
    const res = await request(buildApp()).post('/api/investments/transactions/1/post');
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already posted/i);
  });

  test('GET /transactions/:id/ledger with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/transactions/5/ledger');
    expect(res.status).toBe(200);
    expect(res.body.data.lines).toEqual([]);
  });

  test('GET /reports/portfolio requires reports permission', async () => {
    const res = await request(buildApp()).get('/api/investments/reports/portfolio');
    expect(res.status).toBe(403);
  });

  test('GET /reports/portfolio with reports permission', async () => {
    mockPermissions.push('module:investment:reports');
    const res = await request(buildApp()).get('/api/investments/reports/portfolio');
    expect(res.status).toBe(200);
  });

  test('GET /partners with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/partners');
    expect(res.status).toBe(200);
    expect(res.body.data[0].investorName).toBe('Alpha Partner LLC');
  });

  test('POST /transactions/:id/reject requires approve permission', async () => {
    const res = await request(buildApp()).post('/api/investments/transactions/1/reject');
    expect(res.status).toBe(403);
  });

  test('POST /transactions/:id/reject succeeds with approve permission', async () => {
    mockPermissions.push('module:investment:approve');
    const res = await request(buildApp()).post('/api/investments/transactions/1/reject');
    expect(res.status).toBe(200);
    expect(res.body.data.approvalStatus).toBe('REJECTED');
  });

  test('PUT /categories/:id requires update permission', async () => {
    const res = await request(buildApp())
      .put('/api/investments/categories/1')
      .send({ name: 'Updated' });
    expect(res.status).toBe(403);
  });

  test('PUT /categories/:id succeeds with update permission', async () => {
    mockPermissions.push('module:investment:update');
    const res = await request(buildApp())
      .put('/api/investments/categories/1')
      .send({ name: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated');
  });

  test('DELETE /categories/:id requires delete permission', async () => {
    const res = await request(buildApp()).delete('/api/investments/categories/1');
    expect(res.status).toBe(403);
  });

  test('DELETE /categories/:id succeeds with delete permission', async () => {
    mockPermissions.push('module:investment:delete');
    const res = await request(buildApp()).delete('/api/investments/categories/1');
    expect(res.status).toBe(200);
    expect(res.body.data.deactivated).toBe(true);
  });

  test('POST /valuations/import requires valuation permission', async () => {
    const res = await request(buildApp())
      .post('/api/investments/valuations/import')
      .send({ rows: [{ investmentCode: 'INV-1', valuationDate: '2026-01-01', price: 10 }] });
    expect(res.status).toBe(403);
  });

  test('POST /distributions/prepare requires create permission', async () => {
    const res = await request(buildApp())
      .post('/api/investments/distributions/prepare')
      .send({ investmentTransactionId: 1 });
    expect(res.status).toBe(403);
  });

  test('POST /distributions/prepare succeeds with create permission', async () => {
    mockPermissions.push('module:investment:create');
    const res = await request(buildApp())
      .post('/api/investments/distributions/prepare')
      .send({ investmentTransactionId: 1 });
    expect(res.status).toBe(200);
    expect(res.body.data.distributionNo).toBe('IDT-0001');
  });

  test('GET /v2/orders with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/orders');
    expect(res.status).toBe(200);
    expect(res.body.data.orders).toEqual([]);
  });

  test('POST /v2/orders requires create permission', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/orders')
      .send({ portfolioId: 1, instrumentId: 1, side: 'BUY', quantity: 10 });
    expect(res.status).toBe(403);
  });

  test('POST /v2/orders succeeds with create permission', async () => {
    mockPermissions.push('module:investment:create');
    const res = await request(buildApp())
      .post('/api/investments/v2/orders')
      .send({ portfolioId: 1, instrumentId: 1, side: 'BUY', quantity: 10 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DRAFT');
  });

  test('POST /v2/trades/preview with view permission', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/trades/preview')
      .send({ portfolioId: 1, instrumentId: 1, side: 'BUY', quantity: 1, price: 10 });
    expect(res.status).toBe(200);
    expect(res.body.data.valid).toBe(true);
  });

  test('GET /v2/settlements with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/settlements');
    expect(res.status).toBe(200);
    expect(res.body.data.settlements).toEqual([]);
  });

  test('POST /v2/settlements/:id/fail requires update', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/settlements/1/fail')
      .send({ failureReason: 'NSF' });
    expect(res.status).toBe(403);
  });

  test('POST /v2/settlements/:id/fail succeeds with update', async () => {
    mockPermissions.push('module:investment:update');
    const res = await request(buildApp())
      .post('/api/investments/v2/settlements/1/fail')
      .send({ failureReason: 'NSF' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('FAILED');
  });

  test('GET /v2/income with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/income');
    expect(res.status).toBe(200);
    expect(res.body.data.incomeEvents).toEqual([]);
  });

  test('POST /v2/income/generate-schedule requires create', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/income/generate-schedule')
      .send({ portfolioId: 1, instrumentId: 1 });
    expect(res.status).toBe(403);
  });

  test('GET /v2/corporate-actions with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/corporate-actions');
    expect(res.status).toBe(200);
    expect(res.body.data.corporateActions).toEqual([]);
  });

  test('POST /v2/corporate-actions/:id/apply requires update', async () => {
    const res = await request(buildApp()).post('/api/investments/v2/corporate-actions/1/apply');
    expect(res.status).toBe(403);
  });

  test('GET /v2/investors with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/investors');
    expect(res.status).toBe(200);
    expect(res.body.data.investors).toEqual([]);
  });

  test('POST /v2/ownership requires create', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/ownership')
      .send({ portfolioId: 1, investorId: 1, ownershipPercentage: 50, effectiveFrom: '2026-01-01' });
    expect(res.status).toBe(403);
  });

  test('GET /v2/distribution-runs with view', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/distribution-runs');
    expect(res.status).toBe(200);
  });

  test('GET /v2/reconciliation with view permission', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/reconciliation');
    expect(res.status).toBe(200);
    expect(res.body.data.batches).toEqual([]);
  });

  test('POST /v2/reconciliation requires create', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/reconciliation')
      .send({ reconciliationType: 'BROKER', statementDate: '2026-07-01' });
    expect(res.status).toBe(403);
  });

  test('GET /v2/close-periods with view', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/close-periods');
    expect(res.status).toBe(200);
    expect(res.body.data.periods).toEqual([]);
  });

  test('POST /v2/close-periods/:id/reopen requires approve', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/close-periods/1/reopen')
      .send({ reason: 'fix' });
    expect(res.status).toBe(403);
  });

  test('GET /v2/close-periods/lock-check with view', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/close-periods/lock-check?period=2026-07');
    expect(res.status).toBe(200);
    expect(res.body.data.locked).toBe(false);
  });

  test('GET /v2/risk-dashboard with view', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/risk-dashboard');
    expect(res.status).toBe(200);
  });

  test('POST /v2/mandates requires create', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/mandates')
      .send({ name: 'M', effectiveFrom: '2026-01-01' });
    expect(res.status).toBe(403);
  });

  test('POST /v2/breaches/:id/override requires approve', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/breaches/1/override')
      .send({ reason: 'ok' });
    expect(res.status).toBe(403);
  });

  test('GET /v2/report-catalog with view', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/report-catalog');
    expect(res.status).toBe(200);
  });

  test('GET /v2/executive-dashboard with view', async () => {
    const res = await request(buildApp()).get('/api/investments/v2/executive-dashboard');
    expect(res.status).toBe(200);
  });

  test('POST /v2/copilot/invoke with view', async () => {
    const res = await request(buildApp())
      .post('/api/investments/v2/copilot/invoke')
      .send({ tool: 'getPortfolioSummary' });
    expect(res.status).toBe(200);
    expect(res.body.data.grounded).toBe(true);
  });
});
