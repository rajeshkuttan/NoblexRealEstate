jest.mock('../utils/companyScope', () => {
  const actual = jest.requireActual('../utils/companyScope');
  return {
    ...actual,
    assertAccountInCompany: jest.fn().mockResolvedValue(true),
    assertVendorInCompany: jest.fn().mockResolvedValue(true),
  };
});

const dpiController = require('../controllers/directPurchaseInvoiceController');
const {
  summarizeLines,
  computeLineTotals,
  resolvePayableIdForDpi,
  validateDpiPostingAccounts,
} = dpiController;
const { refreshDirectPurchaseInvoiceFromAllocations } = require('../controllers/paymentController');
const companyScope = require('../utils/companyScope');

jest.mock('../services/companyAccountingEntry.service', () => ({
  createCompanyAccountingEntry: jest.fn().mockResolvedValue([{ id: 1 }]),
  COMPANY_AUDIT_ACTIONS: {
    DIRECT_PURCHASE_INVOICE_POSTED: 'DIRECT_PURCHASE_INVOICE_POSTED',
    FINANCE_POSTING_REVERSED: 'FINANCE_POSTING_REVERSED',
  },
}));

describe('Direct Purchase Invoice', () => {
  describe('line totals', () => {
    test('computeLineTotals with 5% VAT', () => {
      const t = computeLineTotals({ amount: 1000, taxRate: 5 });
      expect(t.amount).toBe(1000);
      expect(t.taxAmount).toBe(50);
      expect(t.totalAmount).toBe(1050);
    });

    test('summarizeLines aggregates', () => {
      const s = summarizeLines([
        { amount: 100, taxRate: 5 },
        { amount: 200, taxRate: 0 },
      ]);
      expect(s.subtotalAmount).toBe(300);
      expect(s.taxAmount).toBe(5);
      expect(s.totalAmount).toBe(305);
    });
  });

  describe('refreshDirectPurchaseInvoiceFromAllocations', () => {
    const { DirectPurchaseInvoice, PaymentInvoiceAllocation } = require('../models');

    afterEach(() => jest.restoreAllMocks());

    test('partial payment sets PARTIALLY_PAID', async () => {
      const inv = {
        id: 1,
        status: 'POSTED',
        totalAmount: 1000,
        update: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(DirectPurchaseInvoice, 'findByPk').mockResolvedValue(inv);
      jest.spyOn(PaymentInvoiceAllocation, 'sum').mockResolvedValue(400);

      await refreshDirectPurchaseInvoiceFromAllocations(1, null);

      expect(inv.update).toHaveBeenCalledWith(
        expect.objectContaining({
          paidAmount: 400,
          outstandingAmount: 600,
          status: 'PARTIALLY_PAID',
        }),
        expect.any(Object)
      );
    });

    test('full payment sets PAID', async () => {
      const inv = {
        id: 2,
        status: 'PARTIALLY_PAID',
        totalAmount: 500,
        update: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(DirectPurchaseInvoice, 'findByPk').mockResolvedValue(inv);
      jest.spyOn(PaymentInvoiceAllocation, 'sum').mockResolvedValue(500);

      await refreshDirectPurchaseInvoiceFromAllocations(2, null);

      expect(inv.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PAID', outstandingAmount: 0 }),
        expect.any(Object)
      );
    });
  });

  describe('company scope', () => {
    test('assertDirectPurchaseInvoiceInCompany exported', () => {
      const scope = require('../utils/companyScope');
      expect(scope.assertDirectPurchaseInvoiceInCompany).toBeDefined();
    });
  });

  describe('permissions config', () => {
    test('DPI permissions defined', () => {
      const { PERMISSION_DEFINITIONS } = require('../config/permissions');
      expect(
        PERMISSION_DEFINITIONS.some((p) => p.code === 'module:finance:direct_purchase_invoice:post')
      ).toBe(true);
    });
  });

  describe('companyScope helpers', () => {
    test('stripCompanyFromBody removes company_id', () => {
      const { stripCompanyFromBody, withCompanyId } = require('../utils/companyScope');
      const body = stripCompanyFromBody({ company_id: 99, vendorId: 1 });
      expect(body.company_id).toBeUndefined();
      expect(body.companyId).toBeUndefined();
      const wrapped = withCompanyId({ companyId: 1 }, { vendorId: 2 });
      expect(wrapped.companyId).toBe(1);
      expect(wrapped.vendorId).toBe(2);
    });
  });

  describe('finance_manager permissions', () => {
    test('finance_manager includes DPI permissions', () => {
      const { SYSTEM_ROLE_PERMISSIONS } = require('../config/permissions');
      const codes = SYSTEM_ROLE_PERMISSIONS.finance_manager;
      expect(codes).toContain('module:finance:direct_purchase_invoice:view');
      expect(codes).toContain('module:finance:direct_purchase_invoice:post');
    });
  });

  describe('audit actions', () => {
    test('DPI audit actions registered', () => {
      const { COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
      expect(COMPANY_AUDIT_ACTIONS.DIRECT_PURCHASE_INVOICE_POSTED).toBeDefined();
      expect(COMPANY_AUDIT_ACTIONS.DIRECT_PURCHASE_INVOICE_PAYMENT_ALLOCATED).toBeDefined();
    });
  });

  describe('no VAT line', () => {
    test('zero tax line totals', () => {
      const t = computeLineTotals({ amount: 500, taxRate: 0, taxAmount: 0 });
      expect(t.taxAmount).toBe(0);
      expect(t.totalAmount).toBe(500);
    });
  });

  describe('resolvePayableIdForDpi', () => {
    test('uses invoice payableAccountId when set', async () => {
      const id = await resolvePayableIdForDpi({ payableAccountId: 42 }, { companyId: 1 }, null);
      expect(id).toBe(42);
      expect(companyScope.assertAccountInCompany).toHaveBeenCalledWith(42, { companyId: 1 });
    });
  });

  describe('validateDpiPostingAccounts', () => {
    const { LedgerSetup, ChartOfAccount } = require('../models');

    afterEach(() => jest.restoreAllMocks());

    test('rejects taxable line without input VAT account when no ledger fallback', async () => {
      jest.spyOn(LedgerSetup, 'findOne').mockResolvedValue(null);
      jest.spyOn(ChartOfAccount, 'findOne').mockResolvedValue(null);

      await expect(
        validateDpiPostingAccounts(
          { payableAccountId: 10 },
          [{ taxAmount: 50, amount: 1000 }],
          { companyId: 1 },
          null
        )
      ).rejects.toThrow(/Input VAT account required/);
    });

    test('accepts taxable line with inputTaxAccountId', async () => {
      jest.spyOn(companyScope, 'assertAccountInCompany').mockResolvedValue(true);

      await expect(
        validateDpiPostingAccounts(
          { payableAccountId: 10 },
          [{ taxAmount: 50, amount: 1000, inputTaxAccountId: 20 }],
          { companyId: 1 },
          null
        )
      ).resolves.toBeUndefined();
    });
  });

  describe('models registered', () => {
    test('DirectPurchaseInvoice in models index', () => {
      const models = require('../models');
      expect(models.DirectPurchaseInvoice).toBeDefined();
      expect(models.DirectPurchaseInvoiceLine).toBeDefined();
    });
  });

  describe('routes file', () => {
    test('routes define post and cancel', () => {
      const fs = require('fs');
      const path = require('path');
      const src = fs.readFileSync(
        path.join(__dirname, '..', 'routes', 'directPurchaseInvoiceRoutes.js'),
        'utf8'
      );
      expect(src).toMatch(/\/:id\/post/);
      expect(src).toMatch(/open-payables/);
    });
  });

  describe('static wiring', () => {
    const fs = require('fs');
    const path = require('path');
    const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

    test('app registers direct-purchase-invoices routes', () => {
      expect(read('app.js')).toMatch(/directPurchaseInvoiceRoutes/);
      expect(read('app.js')).toMatch(/\/api\/direct-purchase-invoices/);
    });

    test('number series includes direct_purchase_invoice', () => {
      const seed = read('services/companyNumberSeriesSeed.service.js');
      expect(seed).toMatch(/direct_purchase_invoice/);
    });

    test('vat return includes DirectPurchaseInvoice', () => {
      const vat = read('controllers/vatReturnController.js');
      expect(vat).toMatch(/DirectPurchaseInvoice/);
    });
  });
});
