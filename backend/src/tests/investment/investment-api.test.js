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
    rejectTransaction: wrap(async () => ({ approvalStatus: 'REJECTED' })),
    listPartners: wrap(async () => [{ investorName: 'Alpha Partner LLC' }]),
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
});
