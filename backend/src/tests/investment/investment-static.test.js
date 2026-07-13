const fs = require('fs');
const path = require('path');
const { INVESTMENT_PERMISSION_CODES, INVESTMENT_EXTRA_PERMISSIONS, SYSTEM_ROLE_PERMISSIONS } = require('../../config/permissions');

const read = (p) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');

describe('Investment static wiring', () => {
  test('app mounts investment module routes', () => {
    expect(read('app.js')).toMatch(/\/api\/investments/);
    expect(read('app.js')).toMatch(/investmentModuleRoutes/);
  });
  test('treasury deposits relocated', () => {
    expect(read('app.js')).toMatch(/\/api\/treasury\/deposits/);
  });
  test('migration exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../migrations/20260626100000-create-investment-module.js'))).toBe(true);
  });
  test('models file exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../models/investmentModels.js'))).toBe(true);
  });
  test('portfolio service exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../services/investment/investmentPortfolio.service.js'))).toBe(true);
  });
  test('transaction service exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../services/investment/investmentTransaction.service.js'))).toBe(true);
  });
  test('posting service exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../services/investment/investmentPosting.service.js'))).toBe(true);
  });
  test('dashboard service exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../services/investment/investmentDashboard.service.js'))).toBe(true);
  });
  test('report service exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../services/investment/investmentReport.service.js'))).toBe(true);
  });
  test('valuation service exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../services/investment/investmentValuation.service.js'))).toBe(true);
  });
  test('allocation service exists', () => {
    expect(fs.existsSync(path.join(__dirname, '../../services/investment/investmentPartnerAllocation.service.js'))).toBe(true);
  });
});

describe('Investment routes', () => {
  const routes = read('routes/investmentModuleRoutes.js');
  test('dashboard route', () => expect(routes).toMatch(/\/dashboard/));
  test('portfolio route', () => expect(routes).toMatch(/\/portfolio/));
  test('assets CRUD', () => {
    expect(routes).toMatch(/\/assets/);
    expect(routes).toMatch(/router\.post\('\/assets'/);
  });
  test('transaction approve post', () => {
    expect(routes).toMatch(/\/transactions\/:id\/approve/);
    expect(routes).toMatch(/\/transactions\/:id\/post/);
    expect(routes).toMatch(/\/transactions\/:id\/reject/);
    expect(routes).toMatch(/\/transactions\/:id\/ledger/);
  });
  test('categories', () => {
    expect(routes).toMatch(/\/categories/);
    expect(routes).toMatch(/router\.put\('\/categories\/:id'/);
    expect(routes).toMatch(/router\.delete\('\/categories\/:id'/);
  });
  test('partners', () => expect(routes).toMatch(/\/partners/));
  test('valuations', () => {
    expect(routes).toMatch(/\/valuations/);
    expect(routes).toMatch(/\/valuations\/import/);
  });
  test('distributions', () => {
    expect(routes).toMatch(/\/distributions/);
    expect(routes).toMatch(/\/distributions\/prepare/);
    expect(routes).toMatch(/\/distributions\/:id\/post/);
  });
  test('allocations', () => expect(routes).toMatch(/\/allocations/));
  test('reports', () => {
    expect(routes).toMatch(/\/reports\/portfolio/);
    expect(routes).toMatch(/\/reports\/ledger/);
    expect(routes).toMatch(/\/reports\/dividends/);
    expect(routes).toMatch(/\/reports\/gain-loss/);
    expect(routes).toMatch(/\/reports\/valuations/);
    expect(routes).toMatch(/\/reports\/partner-statement/);
  });
  test('settings accounts', () => expect(routes).toMatch(/\/settings\/accounts/));
  test('documents', () => {
    expect(routes).toMatch(/\/documents/);
  });
});

describe('Investment permissions', () => {
  test('extra permission codes defined', () => {
    expect(INVESTMENT_EXTRA_PERMISSIONS.map((p) => p.code)).toContain('module:investment:approve');
    expect(INVESTMENT_EXTRA_PERMISSIONS.map((p) => p.code)).toContain('module:investment:post');
    expect(INVESTMENT_EXTRA_PERMISSIONS.length).toBe(6);
  });
  test('base CRUD permissions', () => {
    expect(INVESTMENT_PERMISSION_CODES).toContain('module:investment:view');
    expect(INVESTMENT_PERMISSION_CODES).toContain('module:investment:create');
  });
  test('finance_manager has investment permissions', () => {
    for (const code of INVESTMENT_PERMISSION_CODES) {
      expect(SYSTEM_ROLE_PERMISSIONS.finance_manager).toContain(code);
    }
  });
  test('viewer has reports', () => {
    expect(SYSTEM_ROLE_PERMISSIONS.viewer).toContain('module:investment:reports');
  });
});
