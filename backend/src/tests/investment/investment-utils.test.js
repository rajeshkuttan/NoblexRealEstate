const {
  applyBuyToHolding,
  applySellToHolding,
  calcBaseAmount,
} = require('../../services/investment/investmentTransaction.service');
const { round2, assertBalanced, buildAtLine } = require('../../services/investment/investmentFinancePostingUtils');
const { buildPostingLines } = require('../../services/investment/investmentPosting.service');

function mockHolding(overrides = {}) {
  return {
    quantity: 0,
    averageCost: 0,
    totalCost: 0,
    currentPrice: 0,
    currentMarketValue: 0,
    baseCurrencyValue: 0,
    unrealizedGainLoss: 0,
    realizedGainLoss: 0,
    ...overrides,
  };
}

describe('investmentFinancePostingUtils', () => {
  test('round2', () => expect(round2(1.006)).toBe(1.01));
  test('assertBalanced ok', () => {
    expect(() => assertBalanced([{ debitAmount: 50, creditAmount: 0 }, { debitAmount: 0, creditAmount: 50 }])).not.toThrow();
  });
  test('assertBalanced fail', () => {
    expect(() => assertBalanced([{ debitAmount: 50, creditAmount: 0 }])).toThrow(/Unbalanced/);
  });
  test('buildAtLine debit', () => {
    const l = buildAtLine({ transactionNo: 1, transactionDate: '2026-01-01', jvNumber: 'T1', ledgerId: 1, debit: 100, credit: 0 });
    expect(l.crDr).toBe('Dr');
  });
  test('buildAtLine credit', () => {
    const l = buildAtLine({ transactionNo: 2, transactionDate: '2026-01-01', jvNumber: 'T1', ledgerId: 2, debit: 0, credit: 100 });
    expect(l.crDr).toBe('Cr');
  });
});

describe('holding calculations', () => {
  test('buy updates average cost', () => {
    const h = mockHolding();
    applyBuyToHolding(h, 10, 100, 0);
    expect(Number(h.quantity)).toBe(10);
    expect(Number(h.averageCost)).toBe(100);
    expect(Number(h.totalCost)).toBe(1000);
  });
  test('second buy weighted average', () => {
    const h = mockHolding({ quantity: 10, averageCost: 100, totalCost: 1000, currentPrice: 100 });
    applyBuyToHolding(h, 10, 120, 0);
    expect(Number(h.quantity)).toBe(20);
    expect(Number(h.averageCost)).toBe(110);
    expect(Number(h.totalCost)).toBe(2200);
  });
  test('sell realizes gain', () => {
    const h = mockHolding({ quantity: 10, averageCost: 100, totalCost: 1000, currentPrice: 120 });
    const realized = applySellToHolding(h, 5, 130);
    expect(realized).toBe(150);
    expect(Number(h.quantity)).toBe(5);
    expect(Number(h.realizedGainLoss)).toBe(150);
  });
  test('sell realizes loss', () => {
    const h = mockHolding({ quantity: 10, averageCost: 100, totalCost: 1000, currentPrice: 80 });
    const realized = applySellToHolding(h, 2, 70);
    expect(realized).toBe(-60);
  });
  test('oversell throws', () => {
    const h = mockHolding({ quantity: 5, averageCost: 10, totalCost: 50 });
    expect(() => applySellToHolding(h, 6, 10)).toThrow(/Cannot sell more/);
  });
  test('calcBaseAmount AED', () => expect(calcBaseAmount(100, 1, 'AED')).toBe(100));
  test('calcBaseAmount FX', () => expect(calcBaseAmount(100, 3.67, 'USD')).toBe(367));
});

describe('buildPostingLines', () => {
  const config = {
    investmentAssetAccount: 100,
    dividendIncomeAccount: 200,
    interestIncomeAccount: 201,
    realizedGainAccount: 300,
    realizedLossAccount: 301,
    unrealizedGainAccount: 302,
    unrealizedLossAccount: 303,
    brokerageChargesAccount: 400,
    fxGainAccount: 500,
    fxLossAccount: 501,
  };
  const holding = { averageCost: 10 };

  test('BUY balanced', () => {
    const lines = buildPostingLines(
      { transactionType: 'BUY', baseAmount: 1000, transactionNo: 'T1', bankAccountId: 50 },
      config,
      holding,
      50
    );
    expect(() => assertBalanced(lines.map((l) => ({ debitAmount: l.debit, creditAmount: l.credit })))).not.toThrow();
  });
  test('DIVIDEND balanced', () => {
    const lines = buildPostingLines(
      { transactionType: 'DIVIDEND', baseAmount: 200, transactionNo: 'T2', bankAccountId: 50 },
      config,
      holding,
      50
    );
    expect(lines).toHaveLength(2);
  });
  test('SELL with gain balanced', () => {
    const lines = buildPostingLines(
      { transactionType: 'SELL', baseAmount: 600, quantity: 10, transactionNo: 'T3', bankAccountId: 50 },
      config,
      holding,
      50
    );
    expect(() => assertBalanced(lines.map((l) => ({ debitAmount: l.debit, creditAmount: l.credit })))).not.toThrow();
  });
  test('CHARGE balanced', () => {
    const lines = buildPostingLines(
      { transactionType: 'CHARGE', baseAmount: 25, transactionNo: 'T4', bankAccountId: 50 },
      config,
      holding,
      50
    );
    expect(lines).toHaveLength(2);
  });
  test('REVALUATION gain', () => {
    const lines = buildPostingLines({ transactionType: 'REVALUATION', netAmount: 50, transactionNo: 'T5' }, config, holding, null);
    expect(lines.length).toBeGreaterThanOrEqual(2);
  });
  test('BONUS produces no GL lines', () => {
    const lines = buildPostingLines({ transactionType: 'BONUS', baseAmount: 0, transactionNo: 'B1' }, config, holding, null);
    expect(lines).toHaveLength(0);
  });
  test('WRITE_OFF balanced', () => {
    const lines = buildPostingLines(
      { transactionType: 'WRITE_OFF', quantity: 5, baseAmount: 50, transactionNo: 'W1' },
      config,
      holding,
      null
    );
    expect(() => assertBalanced(lines.map((l) => ({ debitAmount: l.debit, creditAmount: l.credit })))).not.toThrow();
  });
  test('unsupported type throws', () => {
    expect(() => buildPostingLines({ transactionType: 'TRANSFER', baseAmount: 1, transactionNo: 'X' }, config, holding, null)).toThrow();
  });
});
