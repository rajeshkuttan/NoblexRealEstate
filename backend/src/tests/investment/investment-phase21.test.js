'use strict';

const {
  round2,
  round10,
  sourcePriority,
  selectBestPrice,
  pickPriceValue,
  priceChangePct,
  detectPriceExceptions,
  computeLineMarketValue,
  computeNAV,
  investorNAV,
  navMovement,
  absoluteReturn,
  moneyWeightedReturn,
  timeWeightedReturn,
  twrFromNavSeries,
  irr,
  annualizeReturn,
  excessReturn,
  volatility,
  maxDrawdown,
  sharpeRatio,
  capitalReturn,
  incomeReturn,
  computePerformancePeriod,
  canTransitionBatch,
  validateImportRows,
  BATCH_TRANSITIONS,
  DEFAULT_SOURCE_PRIORITY,
} = require('../../services/investment/performance/performanceEngine.service');

describe('Phase 21 source hierarchy', () => {
  test('custodian beats manual', () => {
    expect(sourcePriority('CUSTODIAN')).toBeLessThan(sourcePriority('MANUAL'));
  });
  test('DEFAULT_SOURCE_PRIORITY keys', () => {
    expect(DEFAULT_SOURCE_PRIORITY.EXCHANGE).toBe(30);
  });
});

describe('Phase 21 selectBestPrice', () => {
  const candidates = [
    { instrumentId: 1, priceDate: '2026-01-01', close: 10, source: 'MANUAL', sourcePriority: 100 },
    { instrumentId: 1, priceDate: '2026-01-01', close: 10.5, source: 'CUSTODIAN', sourcePriority: 10 },
    { instrumentId: 1, priceDate: '2025-12-01', close: 9, source: 'BROKER', sourcePriority: 20 },
  ];

  test('prefers higher priority same date', () => {
    const best = selectBestPrice(candidates, '2026-01-01');
    expect(best.value).toBe(10.5);
    expect(best.source).toBe('CUSTODIAN');
  });

  test('stale when older than threshold', () => {
    const best = selectBestPrice(
      [{ priceDate: '2025-01-01', close: 8, source: 'MANUAL' }],
      '2026-01-01',
      { staleDays: 5 }
    );
    expect(best.stale).toBe(true);
    expect(best.exception).toBe('STALE_PRICE');
  });

  test('null when no candidates', () => {
    expect(selectBestPrice([], '2026-01-01')).toBeNull();
  });
});

describe('Phase 21 pickPriceValue', () => {
  test('mid from bid/ask', () => {
    expect(pickPriceValue({ bid: 9, ask: 11 }, 'MID')).toBe(10);
  });
  test('close default', () => {
    expect(pickPriceValue({ close: 12.3 })).toBe(12.3);
  });
  test('nav type', () => {
    expect(pickPriceValue({ nav: 1.05 }, 'NAV')).toBe(1.05);
  });
});

describe('Phase 21 price exceptions', () => {
  test('missing price', () => {
    const ex = detectPriceExceptions({ price: null, quantity: 10 });
    expect(ex[0].code).toBe('MISSING_PRICE');
  });
  test('outlier', () => {
    const ex = detectPriceExceptions({
      price: 20,
      priorPrice: 10,
      quantity: 1,
      opts: { changeTolerancePct: 15 },
    });
    expect(ex.some((e) => e.code === 'OUTLIER')).toBe(true);
  });
  test('stale flag', () => {
    const ex = detectPriceExceptions({ price: 10, quantity: 1, opts: { stale: true } });
    expect(ex.some((e) => e.code === 'STALE_PRICE')).toBe(true);
  });
  test('priceChangePct', () => {
    expect(priceChangePct(100, 110)).toBe(10);
  });
});

describe('Phase 21 line MV', () => {
  test('computes UGL', () => {
    const r = computeLineMarketValue(100, 12, 1000);
    expect(r.marketValue).toBe(1200);
    expect(r.unrealizedGainLoss).toBe(200);
  });
});

describe('Phase 21 NAV formula', () => {
  test('MV + cash + recv + accrued - pay - fees - liab', () => {
    const n = computeNAV({
      marketValue: 1000,
      cash: 100,
      receivables: 50,
      accruedIncome: 25,
      payables: 40,
      fees: 10,
      liabilities: 25,
      units: 100,
    });
    expect(n.nav).toBe(1100);
    expect(n.navPerUnit).toBe(11);
  });

  test('investor NAV by ownership', () => {
    expect(investorNAV(1000, 40)).toBe(400);
  });

  test('nav movement', () => {
    const m = navMovement(1000, 1200, { contributions: 100, distributions: 50, income: 20 });
    expect(m.change).toBe(200);
    expect(m.marketMove).toBe(130); // 1200-1000-100+50-20
  });
});

describe('Phase 21 absolute / MWR / TWR', () => {
  test('absolute return 10%', () => {
    expect(absoluteReturn(100, 110, 0)).toBe(0.1);
  });

  test('MWR with mid-period flow', () => {
    // (110 - 100 - 10) / (100 + 10*0.5) = 0 / 105 = 0
    expect(moneyWeightedReturn(100, 110, 10, 0.5)).toBe(0);
  });

  test('MWR gain', () => {
    expect(moneyWeightedReturn(100, 120, 0)).toBe(0.2);
  });

  test('TWR geometric link', () => {
    expect(timeWeightedReturn([0.1, 0.1])).toBeCloseTo(0.21, 10);
  });

  test('TWR from NAV series', () => {
    const twr = twrFromNavSeries(
      [
        { date: '2024-01-01', value: 100 },
        { date: '2024-02-01', value: 110 },
        { date: '2024-03-01', value: 121 },
      ],
      []
    );
    expect(twr).toBeCloseTo(0.21, 8);
  });
});

describe('Phase 21 IRR', () => {
  test('simple one-period IRR', () => {
    // -100 at t0, +110 at t1 => 10%
    const r = irr([
      { amount: -100, t: 0 },
      { amount: 110, t: 1 },
    ]);
    expect(r).toBeCloseTo(0.1, 5);
  });

  test('null for single cashflow', () => {
    expect(irr([{ amount: -100, t: 0 }])).toBeNull();
  });
});

describe('Phase 21 annualize / excess / risk', () => {
  test('annualize ~ daily compounding', () => {
    const a = annualizeReturn(0.01, 30);
    expect(a).toBeGreaterThan(0.1);
  });

  test('excess return', () => {
    expect(excessReturn(0.12, 0.1)).toBeCloseTo(0.02, 10);
  });

  test('volatility', () => {
    const v = volatility([0.01, -0.01, 0.02, 0]);
    expect(v).toBeGreaterThan(0);
  });

  test('max drawdown', () => {
    expect(maxDrawdown([100, 120, 90, 95])).toBeCloseTo(0.25, 6);
  });

  test('sharpe', () => {
    expect(sharpeRatio(0.1, 0.02, 0.2)).toBeCloseTo(0.4, 10);
  });
});

describe('Phase 21 income / capital return', () => {
  test('income return', () => {
    expect(incomeReturn(1000, 50)).toBe(0.05);
  });
  test('capital return excludes income', () => {
    expect(capitalReturn(1000, 1100, 50, 0)).toBe(0.05);
  });
});

describe('Phase 21 computePerformancePeriod bundle', () => {
  test('returns core metrics', () => {
    const m = computePerformancePeriod({
      openingValue: 1000,
      closingValue: 1100,
      externalFlows: 0,
      income: 20,
      daysInPeriod: 365,
      benchmarkReturn: 0.05,
      returns: [0.01, 0.02, -0.01],
      values: [100, 110, 105],
      riskFreeRate: 0.02,
    });
    expect(m.absoluteReturn).toBe(0.1);
    expect(m.twr).toBe(0.1);
    expect(m.excessReturn).toBeCloseTo(0.05, 8);
    expect(m.volatility).not.toBeNull();
    expect(m.maxDrawdown).not.toBeNull();
  });
});

describe('Phase 21 batch transitions', () => {
  test.each([
    ['DRAFT', 'VALIDATED'],
    ['VALIDATED', 'APPROVED'],
    ['APPROVED', 'POSTED'],
    ['POSTED', 'LOCKED'],
  ])('%s → %s', (a, b) => {
    expect(canTransitionBatch(a, b)).toBe(true);
  });

  test('LOCKED terminal', () => {
    expect(canTransitionBatch('LOCKED', 'POSTED')).toBe(false);
  });

  test('BATCH_TRANSITIONS size', () => {
    expect(Object.keys(BATCH_TRANSITIONS).length).toBe(8);
  });
});

describe('Phase 21 import validation', () => {
  test('duplicate detection', () => {
    const v = validateImportRows([
      { instrumentId: 1, priceDate: '2026-01-01', close: 1 },
      { instrumentId: 1, priceDate: '2026-01-01', close: 2 },
    ]);
    expect(v.valid).toBe(false);
    expect(v.errors[0].code).toBe('DUPLICATE');
  });

  test('missing price', () => {
    const v = validateImportRows([{ instrumentId: 1, priceDate: '2026-01-01' }]);
    expect(v.errors.some((e) => e.code === 'MISSING_PRICE')).toBe(true);
  });

  test('locked period', () => {
    const v = validateImportRows(
      [{ instrumentId: 1, priceDate: '2026-01-01', close: 1 }],
      { lockedDates: ['2026-01-01'] }
    );
    expect(v.errors.some((e) => e.code === 'LOCKED_PERIOD')).toBe(true);
  });

  test('valid row', () => {
    expect(
      validateImportRows([{ instrumentId: 1, priceDate: '2026-01-01', close: 10 }]).valid
    ).toBe(true);
  });
});

describe('Phase 21 TWR / MWR matrix', () => {
  test.each([
    [100, 110, 0, 0.1],
    [100, 100, 0, 0],
    [200, 180, 0, -0.1],
  ])('abs open=%i close=%i => %p', (o, c, f, expected) => {
    expect(absoluteReturn(o, c, f)).toBe(expected);
  });
});

describe('Phase 21 NAV matrix', () => {
  test.each([
    [1000, 0, 0, 0, 0, 0, 0, 1000],
    [1000, 100, 0, 0, 50, 0, 0, 1050],
    [500, 0, 0, 50, 0, 25, 25, 500],
  ])('NAV cases', (mv, cash, recv, acc, pay, fees, liab, expected) => {
    expect(
      computeNAV({
        marketValue: mv,
        cash,
        receivables: recv,
        accruedIncome: acc,
        payables: pay,
        fees,
        liabilities: liab,
      }).nav
    ).toBe(expected);
  });
});

describe('Phase 21 IRR / annualize edges', () => {
  test('round helpers', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round10(0.1 + 0.2)).toBeCloseTo(0.3, 10);
  });
});

describe('Phase 21 drawdown / vol matrix', () => {
  test.each([
    [[10, 10, 10], 0],
    [[100, 80], 0.2],
    [[50, 100, 75], 0.25],
  ])('drawdown %j => %p', (vals, dd) => {
    expect(maxDrawdown(vals)).toBeCloseTo(dd, 6);
  });
});

describe('Phase 21 best price mid hierarchy', () => {
  test('newer date wins over older higher priority', () => {
    const best = selectBestPrice(
      [
        { priceDate: '2026-01-10', close: 11, source: 'MANUAL', sourcePriority: 100 },
        { priceDate: '2026-01-01', close: 99, source: 'CUSTODIAN', sourcePriority: 10 },
      ],
      '2026-01-10'
    );
    expect(best.value).toBe(11);
  });
});

describe('Phase 21 performance with sub-periods', () => {
  test('uses subPeriodReturns for TWR', () => {
    const m = computePerformancePeriod({
      openingValue: 100,
      closingValue: 120,
      subPeriodReturns: [0.05, 0.05],
    });
    expect(m.twr).toBeCloseTo(0.1025, 8);
  });
});

describe('Phase 21 investor NAV matrix', () => {
  test.each([
    [1000, 100, 1000],
    [1000, 0, 0],
    [250, 40, 100],
  ])('%i * %i%% = %i', (nav, pct, expected) => {
    expect(investorNAV(nav, pct)).toBe(expected);
  });
});

describe('Phase 21 expanded coverage', () => {
  test.each([
    ['CUSTODIAN', 10],
    ['BROKER', 20],
    ['EXCHANGE', 30],
    ['API', 40],
    ['IMPORT', 50],
    ['MANUAL', 100],
    ['UNKNOWN', 100],
  ])('source %s priority %i', (src, p) => {
    expect(sourcePriority(src)).toBe(p);
  });

  test.each([
    ['DRAFT', 'IMPORTED', true],
    ['DRAFT', 'EXCEPTION', true],
    ['EXCEPTION', 'VALIDATED', true],
    ['APPROVED', 'REVERSED', true],
    ['POSTED', 'REVERSED', true],
    ['LOCKED', 'REVERSED', false],
    ['REVERSED', 'DRAFT', false],
  ])('batch %s→%s allowed=%p', (from, to, ok) => {
    expect(canTransitionBatch(from, to)).toBe(ok);
  });

  test.each([
    [null, null],
    [0, null],
    [-5, null],
  ])('absoluteReturn edge open=%p => %p', (open, expected) => {
    expect(absoluteReturn(open, 110, 0)).toBe(expected);
  });

  test('TWR empty', () => {
    expect(timeWeightedReturn([])).toBeNull();
  });

  test('volatility single point', () => {
    expect(volatility([0.01])).toBeNull();
  });

  test('sharpe zero vol', () => {
    expect(sharpeRatio(0.1, 0, 0)).toBeNull();
  });

  test('nav movement without prior flows', () => {
    const m = navMovement(500, 500, {});
    expect(m.change).toBe(0);
    expect(m.marketMove).toBe(0);
  });

  test('pickPriceValue bid/ask', () => {
    expect(pickPriceValue({ bid: 1 }, 'BID')).toBe(1);
    expect(pickPriceValue({ ask: 2 }, 'ASK')).toBe(2);
    expect(pickPriceValue({}, 'MID')).toBeNull();
  });

  test('computePerformancePeriod IRR default cashflows', () => {
    const m = computePerformancePeriod({
      openingValue: 100,
      closingValue: 110,
      externalFlows: 0,
    });
    expect(m.irr).toBeCloseTo(0.1, 4);
  });

  test('validateImportRows empty', () => {
    expect(validateImportRows([]).valid).toBe(true);
  });

  test('selectBestPrice ignores future dates', () => {
    expect(
      selectBestPrice([{ priceDate: '2027-01-01', close: 99, source: 'MANUAL' }], '2026-01-01')
    ).toBeNull();
  });

  test('moneyWeightedReturn zero denom edge', () => {
    expect(moneyWeightedReturn(0, 0, 0)).toBeNull();
  });

  test.each([
    [[0.05, -0.02, 0.03]],
    [[0.1, 0.1, 0.1, -0.05]],
  ])('vol series %#', (series) => {
    expect(volatility(series)).toBeGreaterThan(0);
  });
});
