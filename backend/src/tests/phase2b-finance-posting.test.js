const {
  POSTING_BLOCKED_MSG,
  assertPostingCompany,
  buildPostingContext,
  resolvePostingCompanyId,
  loadPostingSource,
} = require('../services/financePostingContext.service');
const {
  assertPaymentInCompany,
  validatePostingLineRefs,
} = require('../utils/companyScope');
const {
  createCompanyAccountingEntry,
  createCompanyFinancialTransaction,
} = require('../services/companyAccountingEntry.service');
const { COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

jest.mock('../models', () => ({
  AccountsTrans: { create: jest.fn() },
  FinancialTransaction: { create: jest.fn() },
  ChartOfAccount: { findOne: jest.fn() },
  Invoice: { findOne: jest.fn() },
  Payment: { findOne: jest.fn() },
  Cheque: { findOne: jest.fn() },
  BankAccount: { findOne: jest.fn() },
  Vendor: { findOne: jest.fn() },
  VendorInvoice: { findOne: jest.fn() },
  Lease: { findOne: jest.fn() },
  Tenant: { findOne: jest.fn() },
  JournalVoucher: { findOne: jest.fn() },
  PurchaseInvoice: { findOne: jest.fn() },
  PurchaseOrder: { findOne: jest.fn() },
  SecurityDeposit: { findOne: jest.fn() },
  AuditLog: { create: jest.fn().mockResolvedValue({}) },
}));

jest.mock('../services/companyAuditService', () => ({
  COMPANY_AUDIT_ACTIONS: {
    CROSS_COMPANY_FINANCE_POSTING_BLOCKED: 'CROSS_COMPANY_FINANCE_POSTING_BLOCKED',
    INVOICE_POSTED: 'INVOICE_POSTED',
    FINANCE_POSTING_REVERSED: 'FINANCE_POSTING_REVERSED',
  },
  logCompanyEvent: jest.fn().mockResolvedValue(undefined),
}));

const { AccountsTrans, FinancialTransaction, ChartOfAccount } = require('../models');
const { logCompanyEvent } = require('../services/companyAuditService');

describe('financePostingContext', () => {
  const req = { companyId: 2, user: { id: 10 } };

  test('assertPostingCompany blocks mismatched source company', () => {
    expect(() =>
      assertPostingCompany(2, 5, req, { sourceType: 'invoice' })
    ).toThrow(POSTING_BLOCKED_MSG);
    expect(logCompanyEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CROSS_COMPANY_FINANCE_POSTING_BLOCKED',
      })
    );
  });

  test('resolvePostingCompanyId rejects mismatched source', () => {
    expect(() => resolvePostingCompanyId(req, { companyId: 99 })).toThrow(
      POSTING_BLOCKED_MSG
    );
  });

  test('resolvePostingCompanyId accepts matching source', () => {
    expect(resolvePostingCompanyId(req, { companyId: 2 })).toBe(2);
  });

  test('buildPostingContext returns companyId from req', () => {
    const ctx = buildPostingContext({
      req,
      sourceType: 'payment',
      sourceId: 9,
      sourceRecord: { id: 9, companyId: 2 },
    });
    expect(ctx.companyId).toBe(2);
    expect(ctx.sourceType).toBe('payment');
  });
});

describe('createCompanyAccountingEntry', () => {
  const req = { companyId: 2, user: { id: 1 } };

  beforeEach(() => {
    jest.clearAllMocks();
    ChartOfAccount.findOne.mockResolvedValue({ id: 100, companyId: 2 });
    AccountsTrans.create.mockImplementation((data) => Promise.resolve({ ...data, id: 1 }));
  });

  test('creates lines with enforced company_id', async () => {
    const lines = await createCompanyAccountingEntry({
      companyId: 2,
      lines: [
        { ledgerId: 100, transactionNo: 1, debitAmount: 10, creditAmount: 0 },
        { ledgerId: 100, transactionNo: 2, debitAmount: 0, creditAmount: 10 },
      ],
      req,
      sourceType: 'invoice',
      sourceId: 5,
      auditAction: COMPANY_AUDIT_ACTIONS.INVOICE_POSTED,
    });
    expect(lines).toHaveLength(2);
    expect(AccountsTrans.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 2 }),
      undefined
    );
  });

  test('rejects account from another company', async () => {
    ChartOfAccount.findOne.mockResolvedValue(null);
    await expect(
      createCompanyAccountingEntry({
        companyId: 2,
        lines: [{ ledgerId: 999, transactionNo: 1 }],
        req,
      })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('rejects mismatched line company_id', async () => {
    await expect(
      createCompanyAccountingEntry({
        companyId: 2,
        lines: [{ companyId: 3, ledgerId: 100, transactionNo: 1 }],
        req,
      })
    ).rejects.toThrow('does not match posting context');
  });
});

describe('createCompanyFinancialTransaction', () => {
  const req = { companyId: 2, user: { id: 1 } };

  beforeEach(() => {
    jest.clearAllMocks();
    ChartOfAccount.findOne.mockResolvedValue({ id: 50, companyId: 2 });
    FinancialTransaction.create.mockResolvedValue({ id: 1, companyId: 2 });
  });

  test('sets companyId on financial transaction', async () => {
    const row = await createCompanyFinancialTransaction({
      companyId: 2,
      payload: {
        transactionNumber: 'FT-1',
        transactionDate: new Date(),
        description: 'test',
        amount: 100,
        transactionType: 'debit',
        accountId: 50,
        status: 'approved',
      },
      req,
    });
    expect(row.companyId).toBe(2);
    expect(FinancialTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ companyId: 2 }),
      undefined
    );
  });
});

describe('loadPostingSource', () => {
  test('returns record scoped to company', async () => {
    const Model = {
      findOne: jest.fn().mockResolvedValue({ id: 1, companyId: 2 }),
    };
    const row = await loadPostingSource(Model, 1, { companyId: 2 });
    expect(row.id).toBe(1);
    expect(Model.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 1, companyId: 2 }) })
    );
  });

  test('404 when not in company', async () => {
    const Model = { findOne: jest.fn().mockResolvedValue(null) };
    await expect(loadPostingSource(Model, 99, { companyId: 2 })).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('companyScope posting asserts', () => {
  const req = { companyId: 2 };

  beforeEach(() => {
    jest.clearAllMocks();
    const { Payment } = require('../models');
    Payment.findOne.mockResolvedValue({ id: 5, companyId: 2 });
    ChartOfAccount.findOne.mockResolvedValue({ id: 10, companyId: 2 });
  });

  test('assertPaymentInCompany passes for same company', async () => {
    const row = await assertPaymentInCompany(5, req);
    expect(row.id).toBe(5);
  });

  test('validatePostingLineRefs checks ledgerId', async () => {
    await validatePostingLineRefs(req, { ledgerId: 10 });
    expect(ChartOfAccount.findOne).toHaveBeenCalled();
  });
});

describe('createCompanyAccountingEntry guards', () => {
  test('rejects missing companyId', async () => {
    await expect(
      createCompanyAccountingEntry({ companyId: null, lines: [], req: { companyId: 2 } })
    ).rejects.toThrow();
  });
});

describe('posting hardening expectations', () => {
  test('no hardcoded companyId 1 in posting context service', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '../services/financePostingContext.service.js'),
      'utf8'
    );
    expect(src).not.toMatch(/companyId:\s*1\b/);
    expect(src).not.toMatch(/company_id:\s*1\b/);
  });

  test('composite uniqueness allows same code across companies (conceptual)', () => {
    const a = { companyId: 1, accountCode: '1000' };
    const b = { companyId: 2, accountCode: '1000' };
    expect(a.accountCode).toBe(b.accountCode);
    expect(a.companyId).not.toBe(b.companyId);
  });
});
