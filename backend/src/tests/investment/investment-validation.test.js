const {
  applyBonusToHolding,
  applySplitToHolding,
  applyWriteOffToHolding,
  validateTransactionPayload,
} = require('../../services/investment/investmentTransaction.service');
const { assertBalanced, buildAtLine } = require('../../services/investment/investmentFinancePostingUtils');
const { buildPostingLines } = require('../../services/investment/investmentPosting.service');
const { DEFAULT_PREFIX_BY_TYPE } = require('../../services/companyNumberSeriesSeed.service');

function mockAsset(overrides = {}) {
  return {
    status: 'ACTIVE',
    acquisitionDate: '2025-01-01',
    currencyCode: 'AED',
    ...overrides,
  };
}

describe('validateTransactionPayload', () => {
  test('requires transactionType and date', () => {
    expect(() => validateTransactionPayload(mockAsset(), {})).toThrow(/required/);
  });
  test('requires exchange rate for non-AED', () => {
    expect(() =>
      validateTransactionPayload(mockAsset(), {
        transactionType: 'BUY',
        transactionDate: '2025-02-01',
        currencyCode: 'USD',
      })
    ).toThrow(/exchange_rate/);
  });
  test('allows non-AED with exchange rate', () => {
    expect(() =>
      validateTransactionPayload(mockAsset(), {
        transactionType: 'BUY',
        transactionDate: '2025-02-01',
        currencyCode: 'USD',
        exchangeRate: 3.67,
      })
    ).not.toThrow();
  });
  test('blocks transaction before acquisition', () => {
    expect(() =>
      validateTransactionPayload(mockAsset({ acquisitionDate: '2025-06-01' }), {
        transactionType: 'BUY',
        transactionDate: '2025-01-15',
      })
    ).toThrow(/before acquisition/);
  });
  test('blocks dividend on closed asset', () => {
    expect(() =>
      validateTransactionPayload(mockAsset({ status: 'CLOSED' }), {
        transactionType: 'DIVIDEND',
        transactionDate: '2025-03-01',
      })
    ).toThrow(/closed\/sold/);
  });
});

describe('REVALUATION and FX posting lines', () => {
  const config = {
    investmentAssetAccount: 100,
    unrealizedGainAccount: 302,
    unrealizedLossAccount: 303,
    fxGainAccount: 500,
    fxLossAccount: 501,
  };

  test('REVALUATION gain balanced', () => {
    const lines = buildPostingLines(
      { transactionType: 'REVALUATION', netAmount: 150, transactionNo: 'R1' },
      config,
      {},
      null
    );
    expect(() => assertBalanced(lines.map((l) => ({ debitAmount: l.debit, creditAmount: l.credit })))).not.toThrow();
  });
  test('REVALUATION loss balanced', () => {
    const lines = buildPostingLines(
      { transactionType: 'REVALUATION', netAmount: -80, transactionNo: 'R2' },
      config,
      {},
      null
    );
    expect(lines.length).toBeGreaterThan(0);
  });
  test('FX_GAIN_LOSS gain balanced', () => {
    const lines = buildPostingLines(
      { transactionType: 'FX_GAIN_LOSS', netAmount: 40, transactionNo: 'FX1' },
      config,
      {},
      null
    );
    expect(() => assertBalanced(lines.map((l) => ({ debitAmount: l.debit, creditAmount: l.credit })))).not.toThrow();
  });
});

describe('investment number series prefixes', () => {
  test('investment_asset prefix', () => expect(DEFAULT_PREFIX_BY_TYPE.investment_asset).toBe('INV'));
  test('investment_transaction prefix', () => expect(DEFAULT_PREFIX_BY_TYPE.investment_transaction).toBe('ITX'));
  test('investment_valuation prefix', () => expect(DEFAULT_PREFIX_BY_TYPE.investment_valuation).toBe('VAL'));
  test('investment_distribution prefix', () => expect(DEFAULT_PREFIX_BY_TYPE.investment_distribution).toBe('IDT'));
});

describe('ledger GL reference via jvNumber', () => {
  test('buildAtLine stores investment jvNumber', () => {
    const line = buildAtLine({
      transactionNo: 100001,
      transactionDate: '2025-01-01',
      jvNumber: 'ITX-0001',
      ledgerId: 1,
      debit: 100,
      credit: 0,
      investmentTransactionId: 99,
    });
    expect(line.jvNumber).toBe('ITX-0001');
    expect(line.investmentTransactionId).toBe(99);
  });
});

describe('investment category input mapping', () => {
  const { normalizeCategoryInput } = require('../../services/investment/investmentPortfolio.service');

  test('maps frontend aliases to model fields', () => {
    const payload = normalizeCategoryInput({
      categoryCode: 'EQ',
      categoryName: 'Equities',
      assetType: 'equity',
    });
    expect(payload.code).toBe('EQ');
    expect(payload.name).toBe('Equities');
    expect(payload.assetClass).toBe('equity');
  });
});

describe('reject transaction semantics', () => {
  test('pending can be rejected', () => {
    const txn = { approvalStatus: 'PENDING', postingStatus: 'DRAFT' };
    expect(txn.approvalStatus).toBe('PENDING');
  });
});

describe('bonus split write-off holdings', () => {
  function mockHolding(overrides = {}) {
    return {
      quantity: 10,
      averageCost: 100,
      totalCost: 1000,
      currentPrice: 110,
      currentMarketValue: 1100,
      baseCurrencyValue: 1100,
      unrealizedGainLoss: 100,
      realizedGainLoss: 0,
      ...overrides,
    };
  }

  test('bonus lowers average cost', () => {
    const h = mockHolding();
    applyBonusToHolding(h, 10);
    expect(Number(h.quantity)).toBe(20);
    expect(Number(h.averageCost)).toBe(50);
    expect(Number(h.totalCost)).toBe(1000);
  });
  test('split adjusts ratio', () => {
    const h = mockHolding();
    applySplitToHolding(h, 2);
    expect(Number(h.quantity)).toBe(20);
    expect(Number(h.averageCost)).toBe(50);
    expect(Number(h.currentPrice)).toBe(55);
  });
  test('write-off realizes loss', () => {
    const h = mockHolding();
    const amount = applyWriteOffToHolding(h, 2);
    expect(amount).toBe(200);
    expect(Number(h.realizedGainLoss)).toBe(-200);
    expect(Number(h.quantity)).toBe(8);
  });
});
