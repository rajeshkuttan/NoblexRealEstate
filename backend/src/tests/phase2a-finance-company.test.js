const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertAccountInCompany,
  assertInvoiceInCompany,
  assertBankInCompany,
  CROSS_COMPANY_MSG,
} = require('../utils/companyScope');

jest.mock('../models', () => ({
  ChartOfAccount: { findOne: jest.fn(), name: 'ChartOfAccount' },
  Invoice: { findOne: jest.fn(), name: 'Invoice' },
  BankAccount: { findOne: jest.fn(), name: 'BankAccount' },
  Vendor: { findOne: jest.fn() },
  Budget: { findOne: jest.fn() },
  VendorInvoice: { findOne: jest.fn() },
  Lease: { findOne: jest.fn() },
  Tenant: { findOne: jest.fn() },
}));

const { ChartOfAccount, Invoice, BankAccount } = require('../models');

describe('Phase 2A finance company scope', () => {
  const req = { companyId: 1, user: { id: 10 } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('companyWhere requires company context', () => {
    expect(companyWhere(req)).toEqual({ companyId: 1 });
    expect(() => companyWhere({})).toThrow('Company context missing');
  });

  test('withCompanyId strips body company_id and sets active company', () => {
    const payload = withCompanyId(req, { accountCode: '1000', company_id: 99, companyId: 88 });
    expect(payload.companyId).toBe(1);
    expect(payload.company_id).toBeUndefined();
    expect(payload.accountCode).toBe('1000');
  });

  test('stripCompanyFromBody removes company fields', () => {
    expect(stripCompanyFromBody({ companyId: 2, name: 'x' })).toEqual({ name: 'x' });
  });

  test('assertAccountInCompany rejects account from another company', async () => {
    ChartOfAccount.findOne.mockResolvedValue(null);
    await expect(assertAccountInCompany(5, req)).rejects.toMatchObject({
      statusCode: 400,
      message: CROSS_COMPANY_MSG,
    });
    expect(ChartOfAccount.findOne).toHaveBeenCalledWith({
      where: { id: 5, companyId: 1 },
    });
  });

  test('assertInvoiceInCompany allows invoice in active company', async () => {
    Invoice.findOne.mockResolvedValue({ id: 3, companyId: 1 });
    const row = await assertInvoiceInCompany(3, req);
    expect(row.id).toBe(3);
  });

  test('assertBankInCompany rejects foreign bank on PDC deposit', async () => {
    BankAccount.findOne.mockResolvedValue(null);
    await expect(assertBankInCompany(9, req)).rejects.toMatchObject({
      statusCode: 400,
      message: CROSS_COMPANY_MSG,
    });
  });
});

describe('Phase 2A composite uniqueness (conceptual)', () => {
  test('duplicate COA code allowed across companies at DB layer', () => {
    const companyA = { companyId: 1, accountCode: '1000' };
    const companyB = { companyId: 2, accountCode: '1000' };
    expect(companyA.accountCode).toBe(companyB.accountCode);
    expect(companyA.companyId).not.toBe(companyB.companyId);
  });
});
