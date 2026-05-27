const fs = require('fs');
const path = require('path');

jest.mock('../services/companyAuditService', () => ({
  COMPANY_AUDIT_ACTIONS: {
    REPORT_GENERATED: 'REPORT_GENERATED',
    REPORT_EXPORTED: 'REPORT_EXPORTED',
    DASHBOARD_VIEWED: 'DASHBOARD_VIEWED',
    VAT_REPORT_GENERATED: 'VAT_REPORT_GENERATED',
    CROSS_COMPANY_REPORT_ACCESS_BLOCKED: 'CROSS_COMPANY_REPORT_ACCESS_BLOCKED',
  },
  logCompanyEvent: jest.fn().mockResolvedValue(undefined),
}));

const {
  buildReportContext,
  whereCompany,
  applyCompanyFilter,
  validateReportCompany,
  logReportEvent,
} = require('../services/reportCompanyContext.service');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

describe('Phase 2C report context helper', () => {
  test('validateReportCompany accepts company id', () => {
    expect(validateReportCompany(2)).toBe(2);
  });

  test('validateReportCompany throws when company is missing', () => {
    expect(() => validateReportCompany(null)).toThrow('Company context missing');
  });

  test('buildReportContext uses req.companyId', () => {
    const req = { companyId: 3, user: { id: 9 }, company: { id: 3 } };
    expect(buildReportContext(req)).toMatchObject({ companyId: 3, userId: 9 });
  });

  test('whereCompany returns company filter', () => {
    expect(whereCompany({ companyId: 6 })).toEqual({ companyId: 6 });
  });

  test('applyCompanyFilter merges existing where clause', () => {
    expect(applyCompanyFilter({ where: { status: 'active' } }, 10)).toEqual({
      where: { status: 'active', companyId: 10 },
    });
  });

  test('logReportEvent writes company audit event', async () => {
    const req = { companyId: 8, user: { id: 1 }, method: 'GET', url: '/x' };
    await logReportEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.REPORT_GENERATED,
      metadata: { report_type: 'test' },
    });
    expect(logCompanyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'REPORT_GENERATED',
        entityId: 8,
      })
    );
  });
});

describe('Phase 2C static scope checks', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  test('dashboard route includes resolveCompanyContext middleware', () => {
    const src = read('routes/dashboard.js');
    expect(src).toMatch(/resolveCompanyContext/);
    expect(src).toMatch(/router\.get\('\/stats',\s*authenticateToken,\s*resolveCompanyContext,\s*getDashboardStats\)/);
  });

  test('dashboard controller scopes property and payment queries', () => {
    const src = read('controllers/dashboardController.js');
    expect(src).toMatch(/Property\.count\(\{\s*where:\s*\{\s*\.\.\.companyWhere\(req\)/);
    expect(src).toMatch(/Payment\.findAll\(\{\s*where:\s*\{\s*\.\.\.companyWhere\(req\)/);
  });

  test('treasury reports controller scopes with whereCompany', () => {
    const src = read('controllers/treasuryReportsController.js');
    expect(src).toMatch(/whereCompany\(req\)/);
    expect(src).toMatch(/BankAccount\.findAll\(\{\s*where:\s*\{\s*isActive:\s*true,\s*\.\.\.whereCompany\(req\)/);
  });

  test('vat return controller scopes invoice and vendor invoice sums', () => {
    const src = read('controllers/vatReturnController.js');
    expect(src).toMatch(/Invoice\.sum\('taxAmount',\s*\{\s*where:\s*\{\s*\.\.\.whereCompany\(req\)/);
    expect(src).toMatch(/VendorInvoice\.sum\('taxAmount',\s*\{\s*where:\s*\{\s*\.\.\.whereCompany\(req\)/);
  });

  test('bank transaction list/read/update/delete use companyWhere', () => {
    const src = read('controllers/bankTransactionController.js');
    expect(src).toMatch(/const whereClause = \{ isActive: true, \.\.\.companyWhere\(req\) \}/);
    expect(src).toMatch(/where: \{ id, isActive: true, \.\.\.companyWhere\(req\) \}/);
  });

  test('bank account cash position scopes recent transactions', () => {
    const src = read('controllers/bankAccountController.js');
    expect(src).toMatch(/BankTransaction\.findAll\(\{\s*where:\s*\{\s*isActive:\s*true,\s*\.\.\.companyWhere\(req\)/);
    expect(src).toMatch(/BankTransaction\.count\(\{\s*where:\s*\{\s*isActive:\s*true,\s*isReconciled:\s*false,\s*\.\.\.companyWhere\(req\)/);
  });

  test('cheque report endpoints scope PDC register and outstanding', () => {
    const src = read('controllers/chequeController.js');
    expect(src).toMatch(/getPDCRegister/);
    expect(src).toMatch(/getPDCOutstanding/);
    expect(src).toMatch(/\.\.\.companyWhere\(req\)/);
  });

  test('invoice export uses companyWhere in whereClause', () => {
    const src = read('controllers/invoiceController.js');
    expect(src).toMatch(/const whereClause = \{ \.\.\.companyWhere\(req\) \};/);
  });

  test('vendor export uses companyWhere in whereClause', () => {
    const src = read('controllers/vendorInvoiceController.js');
    expect(src).toMatch(/const whereClause = \{ isActive: true,\s*\.\.\.companyWhere\(req\) \};/);
  });

  test('vendor aging report scopes by company', () => {
    const src = read('controllers/vendorInvoiceController.js');
    expect(src).toMatch(/paymentStatus: \{ \[Op\.in\]: \['unpaid', 'partially_paid', 'overdue'\] \},\s*status: 'approved',\s*\.\.\.companyWhere\(req\)/);
  });

  test('financial reports accounts transactions are scoped', () => {
    const src = read('controllers/financialReportsController.js');
    expect(src).toMatch(/const whereClause = \{ \.\.\.whereCompany\(req\) \};/);
    expect(src).toMatch(/AccountsTrans\.findAll\(\{\s*where: whereClause/);
  });

  test('customer and vendor SOA enforce company assertions', () => {
    const src = read('controllers/financialReportsController.js');
    expect(src).toMatch(/await assertTenantInCompany\(tenantId, req\)/);
    expect(src).toMatch(/await assertVendorInCompany\(vendorId, req\)/);
  });

  test('VAT export uses active company TRN fallback chain', () => {
    const src = read('controllers/financialReportsController.js');
    expect(src).toMatch(/req\.company\?\.trn \|\| req\.company\?\.vatNumber \|\| req\.company\?\.vat_number/);
  });
});

describe('Phase 2C frontend safety checks', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8');

  test('vendor aging API forwards params', () => {
    const src = read('src/services/api.ts');
    expect(src).toMatch(/getAgingReport: \(params\?: any\) => api\.get\("\/vendor-invoices\/aging-report", \{ params \}\)/);
  });

  test('company switch invalidates dashboard/report/vat/treasury cache', () => {
    const src = read('src/contexts/CompanyContext.tsx');
    expect(src).toMatch(/\/dashboard/);
    expect(src).toMatch(/\/finance\\\/reports/);
    expect(src).toMatch(/\/treasury-reports/);
    expect(src).toMatch(/\/vat-returns/);
  });

  test('dashboard page refetches on activeCompanyId change', () => {
    const src = read('src/pages/Dashboard.tsx');
    expect(src).toMatch(/useCompany/);
    expect(src).toMatch(/}, \[activeCompanyId\]\)/);
  });

  test('recent activity refetches on company switch', () => {
    const src = read('src/components/dashboard/RecentActivity.tsx');
    expect(src).toMatch(/useCompany/);
    expect(src).toMatch(/}, \[activeCompanyId\]\)/);
  });

  test('treasury reports dashboard refetches on company switch', () => {
    const src = read('src/components/finance/treasury/TreasuryReportsDashboard.tsx');
    expect(src).toMatch(/useCompany/);
    expect(src).toMatch(/}, \[activeCompanyId\]\)/);
  });

  test('financial reports component depends on activeCompanyId', () => {
    const src = read('src/components/finance/FinancialReports.tsx');
    expect(src).toMatch(/useCompany/);
    expect(src).toMatch(/\[selectedPeriod, activeCompanyId\]/);
  });
});
