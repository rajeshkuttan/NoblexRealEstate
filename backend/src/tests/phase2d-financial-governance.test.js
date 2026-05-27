const fs = require('fs');
const path = require('path');

jest.mock('../services/companyAuditService', () => ({
  COMPANY_AUDIT_ACTIONS: {
    NUMBER_SERIES_CREATED: 'NUMBER_SERIES_CREATED',
    PERIOD_HARD_CLOSED: 'PERIOD_HARD_CLOSED',
    VAT_PERIOD_SUBMITTED: 'VAT_PERIOD_SUBMITTED',
    OPENING_BALANCE_IMPORTED: 'OPENING_BALANCE_IMPORTED',
  },
  logCompanyEvent: jest.fn().mockResolvedValue(undefined),
}));

const companyDocumentNumber = require('../services/companyDocumentNumber.service');
const periodValidation = require('../services/periodValidationService');
const vatPeriodService = require('../services/vatPeriodService');
const documentTemplateService = require('../services/documentTemplateService');

describe('Phase 2D company document number service', () => {
  test('resolveDocumentType maps legacy names', () => {
    expect(companyDocumentNumber.resolveDocumentType('Receipt Invoice')).toBe('invoice');
    expect(companyDocumentNumber.resolveDocumentType('journal_voucher')).toBe('journal_voucher');
  });

  test('generateDocumentNumber requires transaction', async () => {
    await expect(
      companyDocumentNumber.generateDocumentNumber({ companyId: 1, documentType: 'invoice' })
    ).rejects.toThrow('Transaction is required');
  });

  test('generateDocumentNumber requires companyId', async () => {
    await expect(
      companyDocumentNumber.generateDocumentNumber({
        documentType: 'invoice',
        transaction: { LOCK: { UPDATE: 'UPDATE' } },
      })
    ).rejects.toThrow('companyId is required');
  });
});

describe('Phase 2D period validation', () => {
  const { CompanyFinancialPeriod } = require('../models');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('isPeriodOpen returns true when no period row', async () => {
    jest.spyOn(CompanyFinancialPeriod, 'findOne').mockResolvedValue(null);
    await expect(periodValidation.isPeriodOpen(1, '2026-05-01')).resolves.toBe(true);
  });

  test('HARD_CLOSED blocks posting validation', async () => {
    jest.spyOn(CompanyFinancialPeriod, 'findOne').mockResolvedValue({
      status: 'HARD_CLOSED',
    });
    await expect(
      periodValidation.validatePostingDate({ companyId: 1, user: { role: 'finance_executive' } }, '2026-05-01')
    ).rejects.toMatchObject({ message: periodValidation.CLOSED_MSG, statusCode: 400 });
  });

  test('SOFT_CLOSED blocks non-admin', async () => {
    jest.spyOn(CompanyFinancialPeriod, 'findOne').mockResolvedValue({
      status: 'SOFT_CLOSED',
    });
    await expect(
      periodValidation.isPeriodOpen(1, '2026-05-01', {
        req: { user: { role: 'finance_executive' }, userRoles: ['finance_executive'] },
      })
    ).resolves.toBe(false);
  });

  test('SOFT_CLOSED allows admin', async () => {
    jest.spyOn(CompanyFinancialPeriod, 'findOne').mockResolvedValue({
      status: 'SOFT_CLOSED',
    });
    await expect(
      periodValidation.isPeriodOpen(1, '2026-05-01', {
        req: { user: { role: 'admin' }, userRoles: ['admin'] },
      })
    ).resolves.toBe(true);
  });
});

describe('Phase 2D VAT period service', () => {
  const { CompanyVatPeriod } = require('../models');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('SUBMITTED period blocks edits', async () => {
    jest.spyOn(CompanyVatPeriod, 'findOne').mockResolvedValue({ status: 'SUBMITTED' });
    await expect(
      vatPeriodService.assertVatPeriodEditable(1, '2026-04-15')
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('OPEN period allows edits', async () => {
    jest.spyOn(CompanyVatPeriod, 'findOne').mockResolvedValue({ status: 'OPEN' });
    await expect(vatPeriodService.assertVatPeriodEditable(1, '2026-04-15')).resolves.toBeUndefined();
  });
});

describe('Phase 2D document template service', () => {
  test('getTemplate merges company row', async () => {
    const { CompanyDocumentTemplate, CompanySetting } = require('../models');
    jest.spyOn(CompanySetting, 'findByPk').mockResolvedValue({
      id: 2,
      companyName: 'Alpha LLC',
      trn: 'TRN123',
      address: 'Dubai',
      logo: '/logo.png',
    });
    jest.spyOn(CompanyDocumentTemplate, 'findOne').mockResolvedValue(null);

    const result = await documentTemplateService.getTemplate(2, 'invoice');
    expect(result.displayName).toBe('Alpha LLC');
    expect(result.company.trn).toBe('TRN123');
  });
});

describe('Phase 2D static wiring checks', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  test('migration creates governance tables', () => {
    const src = read('migrations/20260601100000-phase2d-financial-governance.js');
    expect(src).toMatch(/company_number_series/);
    expect(src).toMatch(/company_financial_years/);
    expect(src).toMatch(/company_vat_periods/);
    expect(src).toMatch(/company_opening_balance_batches/);
  });

  test('invoice controller uses company document numbers', () => {
    const src = read('controllers/invoiceController.js');
    expect(src).toMatch(/companyDocumentNumber\.generateDocumentNumber/);
    expect(src).toMatch(/companyWhere\(req\).*transaction/);
  });

  test('company finance routes registered in app', () => {
    const src = read('app.js');
    expect(src).toMatch(/companyFinanceGovernanceRoutes/);
    expect(src).toMatch(/\/api\/company-finance/);
  });

  test('audit actions include governance events', () => {
    const src = read('services/companyAuditService.js');
    expect(src).toMatch(/NUMBER_SERIES_CREATED/);
    expect(src).toMatch(/VAT_PERIOD_SUBMITTED/);
    expect(src).toMatch(/OPENING_BALANCE_IMPORTED/);
  });

  test('cheque opening import uses withCompanyId', () => {
    const src = read('controllers/chequeController.js');
    expect(src).toMatch(/importOpeningBalance[\s\S]*withCompanyId\(req/);
  });

  test('frontend company finance config page exists', () => {
    const uiPath = path.join(__dirname, '..', '..', '..', 'src', 'pages', 'settings', 'CompanyFinanceConfig.tsx');
    expect(fs.existsSync(uiPath)).toBe(true);
  });

  test('payment controller uses company-scoped fallback count', () => {
    const src = read('controllers/paymentController.js');
    expect(src).toMatch(/Payment\.count\(\{\s*where:\s*\{\s*\.\.\.companyWhere\(req\)/);
  });

  test('journal voucher post validates posting date', () => {
    const src = read('controllers/journalVoucherController.js');
    expect(src).toMatch(/periodValidation\.validatePostingDate/);
  });

  test('vendor invoice create checks VAT period', () => {
    const src = read('controllers/vendorInvoiceController.js');
    expect(src).toMatch(/vatPeriodService\.assertVatPeriodEditable/);
  });

  test('models export governance entities', () => {
    const src = read('models/index.js');
    expect(src).toMatch(/CompanyNumberSeries/);
    expect(src).toMatch(/CompanyOpeningBalanceBatch/);
  });

  test('periodGuard helper exists on frontend', () => {
    const p = path.join(__dirname, '..', '..', '..', 'src', 'lib', 'periodGuard.ts');
    expect(fs.readFileSync(p, 'utf8')).toMatch(/PERIOD_CLOSED_MESSAGE/);
  });
});
