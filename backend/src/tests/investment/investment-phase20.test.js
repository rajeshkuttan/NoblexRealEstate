'use strict';

const {
  round2,
  computeCapitalAccountClosing,
  reconcileCapitalAccounts,
  ownershipAsOf,
  validateOwnershipTotal,
  dayBefore,
  allocateProRata,
  runWaterfall,
  allocateCapitalCall,
  canTransitionDistribution,
  canTransitionCapitalCall,
  partnerStatement,
  DIST_TRANSITIONS,
  CALL_TRANSITIONS,
} = require('../../services/investment/capital/capitalEngine.service');

describe('Phase 20 capital account math', () => {
  test('closing balance formula', () => {
    expect(
      computeCapitalAccountClosing({
        openingBalance: 1000,
        contributions: 500,
        allocatedIncome: 100,
        allocatedGain: 50,
        allocatedLoss: 20,
        distributions: 200,
        returnOfCapital: 30,
      })
    ).toBe(1400);
  });

  test('reconcile balanced accounts', () => {
    const r = reconcileCapitalAccounts([
      {
        investorId: 1,
        openingBalance: 100,
        contributions: 0,
        allocatedIncome: 0,
        allocatedGain: 0,
        allocatedLoss: 0,
        distributions: 0,
        returnOfCapital: 0,
        closingBalance: 100,
      },
    ]);
    expect(r.balanced).toBe(true);
  });

  test('reconcile detects mismatch', () => {
    const r = reconcileCapitalAccounts([
      {
        investorId: 1,
        openingBalance: 100,
        contributions: 0,
        allocatedIncome: 0,
        allocatedGain: 0,
        allocatedLoss: 0,
        distributions: 0,
        returnOfCapital: 0,
        closingBalance: 50,
      },
    ]);
    expect(r.balanced).toBe(false);
  });
});

describe('Phase 20 ownership effective dating', () => {
  const history = [
    {
      id: 1,
      investorId: 1,
      ownershipPercentage: 60,
      effectiveFrom: '2024-01-01',
      effectiveTo: '2024-06-30',
      status: 'SUPERSEDED',
    },
    {
      id: 2,
      investorId: 1,
      ownershipPercentage: 40,
      effectiveFrom: '2024-07-01',
      effectiveTo: null,
      status: 'ACTIVE',
    },
    {
      id: 3,
      investorId: 2,
      ownershipPercentage: 60,
      effectiveFrom: '2024-07-01',
      effectiveTo: null,
      status: 'ACTIVE',
    },
  ];

  test('as of mid-2024 uses superseded row for inv1', () => {
    const rows = ownershipAsOf(history, '2024-03-15');
    const i1 = rows.find((r) => Number(r.investorId) === 1);
    expect(Number(i1.ownershipPercentage)).toBe(60);
  });

  test('as of late-2024 uses active 40/60', () => {
    const rows = ownershipAsOf(history, '2024-08-01');
    expect(rows).toHaveLength(2);
    expect(Number(rows.find((r) => r.investorId === 1).ownershipPercentage)).toBe(40);
  });

  test('dayBefore', () => {
    expect(dayBefore('2024-07-01')).toBe('2024-06-30');
  });

  test('ownership total near 100', () => {
    expect(validateOwnershipTotal([{ ownershipPercentage: 40 }, { ownershipPercentage: 60 }]).valid).toBe(true);
  });
});

describe('Phase 20 pro-rata allocation', () => {
  test('splits by ownership', () => {
    const rows = allocateProRata(1000, [
      { investorId: 1, ownershipPercentage: 60 },
      { investorId: 2, ownershipPercentage: 40 },
    ]);
    expect(rows[0].grossAmount).toBe(600);
    expect(rows[1].grossAmount).toBe(400);
  });

  test('last investor gets rounding residual', () => {
    const rows = allocateProRata(100, [
      { investorId: 1, ownershipPercentage: 33.333 },
      { investorId: 2, ownershipPercentage: 33.333 },
      { investorId: 3, ownershipPercentage: 33.334 },
    ]);
    const sum = round2(rows.reduce((s, r) => s + r.grossAmount, 0));
    expect(sum).toBe(100);
  });

  test('empty owners', () => {
    expect(allocateProRata(100, [])).toEqual([]);
  });
});

describe('Phase 20 waterfall preferred + catch-up + carry', () => {
  const lps = [
    { investorId: 1, ownershipPercentage: 50 },
    { investorId: 2, ownershipPercentage: 50 },
  ];

  test('pro-rata mode without GP', () => {
    const r = runWaterfall({ mode: 'PRO_RATA', distributable: 1000, lps });
    expect(r.summary.totalGross).toBe(1000);
    expect(r.lines).toHaveLength(2);
  });

  test('preferred then residual with carry', () => {
    const r = runWaterfall({
      mode: 'WATERFALL',
      distributable: 1000,
      lps,
      preferredPool: 200,
      carryPercent: 20,
      gpInvestorId: 99,
    });
    expect(r.summary.preferredPaid).toBe(200);
    expect(r.summary.catchUpPaid).toBe(50); // 200 * 0.2 / 0.8
    expect(r.summary.carryPaid).toBe(150); // 20% of remaining 750
    const gp = r.lines.find((l) => Number(l.investorId) === 99);
    expect(gp.catchUpAmount).toBe(50);
    expect(gp.carriedInterestAmount).toBe(150);
    expect(r.summary.totalGross).toBe(1000);
  });

  test('withholding applied', () => {
    const r = runWaterfall({
      mode: 'PRO_RATA',
      distributable: 1000,
      lps,
      withholdingRate: 0.05,
    });
    expect(r.summary.totalWht).toBe(50);
    expect(r.summary.totalNet).toBe(950);
  });

  test('preferred consumes all when pool large', () => {
    const r = runWaterfall({
      mode: 'WATERFALL',
      distributable: 100,
      lps,
      preferredPool: 500,
      gpInvestorId: 99,
      carryPercent: 20,
    });
    expect(r.summary.preferredPaid).toBe(100);
    expect(r.summary.residualPool).toBe(0);
    expect(r.summary.carryPaid).toBe(0);
  });
});

describe('Phase 20 capital call allocation', () => {
  test('pro-rata by unfunded', () => {
    const lines = allocateCapitalCall(30000, [
      { id: 1, investorId: 1, unfundedAmount: 60000 },
      { id: 2, investorId: 2, unfundedAmount: 40000 },
    ]);
    expect(lines[0].calledAmount).toBe(18000);
    expect(lines[1].calledAmount).toBe(12000);
  });

  test('cannot call more than unfunded', () => {
    const lines = allocateCapitalCall(100000, [
      { id: 1, investorId: 1, unfundedAmount: 10000 },
    ]);
    expect(lines[0].calledAmount).toBe(10000);
  });

  test('no unfunded => empty', () => {
    expect(allocateCapitalCall(1000, [{ id: 1, investorId: 1, unfundedAmount: 0 }])).toEqual([]);
  });
});

describe('Phase 20 distribution transitions', () => {
  const ok = [
    ['DRAFT', 'CALCULATED'],
    ['CALCULATED', 'UNDER_REVIEW'],
    ['CALCULATED', 'APPROVED'],
    ['UNDER_REVIEW', 'APPROVED'],
    ['APPROVED', 'PAID'],
    ['PAID', 'RECONCILED'],
    ['RECONCILED', 'STATEMENT_ISSUED'],
  ];
  test.each(ok)('%s → %s', (a, b) => {
    expect(canTransitionDistribution(a, b)).toBe(true);
  });

  test.each([
    ['PAID', 'APPROVED'],
    ['STATEMENT_ISSUED', 'PAID'],
    ['CANCELLED', 'DRAFT'],
  ])('%s → %s blocked', (a, b) => {
    expect(canTransitionDistribution(a, b)).toBe(false);
  });

  test('DIST_TRANSITIONS covers workflow', () => {
    expect(Object.keys(DIST_TRANSITIONS).length).toBe(10);
  });
});

describe('Phase 20 capital call transitions', () => {
  test.each([
    ['DRAFT', 'ISSUED'],
    ['ISSUED', 'PARTIALLY_FUNDED'],
    ['ISSUED', 'FUNDED'],
    ['PARTIALLY_FUNDED', 'FUNDED'],
  ])('%s → %s', (a, b) => {
    expect(canTransitionCapitalCall(a, b)).toBe(true);
  });

  test('FUNDED terminal', () => {
    expect(canTransitionCapitalCall('FUNDED', 'ISSUED')).toBe(false);
  });

  test('CALL_TRANSITIONS size', () => {
    expect(Object.keys(CALL_TRANSITIONS).length).toBe(5);
  });
});

describe('Phase 20 partner statement shape', () => {
  test('builds exportable statement', () => {
    const s = partnerStatement({
      investor: { investorCode: 'INVSTR-1', legalName: 'Alpha LLC' },
      capitalAccount: {
        period: '2026-07',
        openingBalance: 1000,
        contributions: 200,
        allocatedIncome: 50,
        allocatedGain: 0,
        allocatedLoss: 0,
        distributions: 100,
        returnOfCapital: 0,
      },
      ownership: { ownershipPercentage: 40 },
      distributions: [{ netAmount: 100 }],
    });
    expect(s.investorCode).toBe('INVSTR-1');
    expect(s.capitalAccount.closing).toBe(1150);
    expect(s.ownershipPercentage).toBe(40);
  });
});

describe('Phase 20 waterfall LP residual split', () => {
  test('equal LPs get equal residual after carry', () => {
    const r = runWaterfall({
      mode: 'WATERFALL',
      distributable: 1200,
      lps: [
        { investorId: 1, ownershipPercentage: 50 },
        { investorId: 2, ownershipPercentage: 50 },
      ],
      preferredPool: 0,
      carryPercent: 20,
      gpInvestorId: 9,
    });
    // catch-up 0 when preferred 0; residual 1200; carry 240; LP 960 => 480 each
    expect(r.summary.carryPaid).toBe(240);
    const lp1 = r.lines.find((l) => l.investorId === 1);
    const lp2 = r.lines.find((l) => l.investorId === 2);
    expect(lp1.residualAmount).toBe(480);
    expect(lp2.residualAmount).toBe(480);
  });
});

describe('Phase 20 ownership never overwrites — supersede pattern', () => {
  test('two periods coexist in history filter', () => {
    const hist = [
      { investorId: 1, ownershipPercentage: 100, effectiveFrom: '2023-01-01', effectiveTo: '2023-12-31', status: 'SUPERSEDED' },
      { investorId: 1, ownershipPercentage: 70, effectiveFrom: '2024-01-01', effectiveTo: null, status: 'ACTIVE' },
    ];
    expect(ownershipAsOf(hist, '2023-06-01')[0].ownershipPercentage).toBe(100);
    expect(ownershipAsOf(hist, '2024-06-01')[0].ownershipPercentage).toBe(70);
  });
});

describe('Phase 20 allocation edge cases', () => {
  test.each([
    [0, 0],
    [1, 1],
    [99.99, 99.99],
  ])('single LP amount %p', (amt) => {
    const rows = allocateProRata(amt, [{ investorId: 1, ownershipPercentage: 100 }]);
    expect(rows[0]?.grossAmount ?? 0).toBe(amt);
  });
});

describe('Phase 20 capital call matrix', () => {
  test.each([
    [10000, 50000, 50000, 5000, 5000],
    [10000, 90000, 10000, 9000, 1000],
  ])('call %i unfunded %i/%i => %i/%i', (call, u1, u2, e1, e2) => {
    const lines = allocateCapitalCall(call, [
      { id: 1, investorId: 1, unfundedAmount: u1 },
      { id: 2, investorId: 2, unfundedAmount: u2 },
    ]);
    expect(lines[0].calledAmount).toBe(e1);
    expect(lines[1].calledAmount).toBe(e2);
  });
});

describe('Phase 20 waterfall tier labels', () => {
  test('tier breakdown includes PREFERRED', () => {
    const r = runWaterfall({
      mode: 'WATERFALL',
      distributable: 500,
      lps: [{ investorId: 1, ownershipPercentage: 100 }],
      preferredPool: 100,
      gpInvestorId: 2,
      carryPercent: 20,
    });
    const lp = r.lines.find((l) => l.investorId === 1);
    expect(lp.tierBreakdown.some((t) => t.tier === 'PREFERRED')).toBe(true);
  });
});

describe('Phase 20 reconcile multi-investor', () => {
  test('totals closing', () => {
    const r = reconcileCapitalAccounts([
      {
        investorId: 1,
        openingBalance: 100,
        contributions: 0,
        allocatedIncome: 0,
        allocatedGain: 0,
        allocatedLoss: 0,
        distributions: 0,
        returnOfCapital: 0,
        closingBalance: 100,
      },
      {
        investorId: 2,
        openingBalance: 200,
        contributions: 50,
        allocatedIncome: 0,
        allocatedGain: 0,
        allocatedLoss: 0,
        distributions: 25,
        returnOfCapital: 0,
        closingBalance: 225,
      },
    ]);
    expect(r.totalClosing).toBe(325);
    expect(r.balanced).toBe(true);
  });
});

describe('Phase 20 expanded waterfall scenarios', () => {
  test.each([
    [1000, 0, 20, 200],
    [1000, 0, 0, 0],
    [500, 100, 20, 75],
  ])('dist=%i pref=%i carry%%=%i => carryPaid=%i', (dist, pref, carry, expectedCarry) => {
    const r = runWaterfall({
      mode: 'WATERFALL',
      distributable: dist,
      lps: [{ investorId: 1, ownershipPercentage: 100 }],
      preferredPool: pref,
      carryPercent: carry,
      gpInvestorId: 2,
    });
    // after preferred + catch-up, residual carry
    if (carry === 0) expect(r.summary.carryPaid).toBe(0);
    else expect(r.summary.carryPaid).toBe(expectedCarry);
  });

  test('three LPs uneven ownership', () => {
    const rows = allocateProRata(1000, [
      { investorId: 1, ownershipPercentage: 50 },
      { investorId: 2, ownershipPercentage: 30 },
      { investorId: 3, ownershipPercentage: 20 },
    ]);
    expect(rows.map((r) => r.grossAmount)).toEqual([500, 300, 200]);
  });
});

describe('Phase 20 ownership validation matrix', () => {
  test.each([
    [[50, 50], true],
    [[100], true],
    [[40, 40, 20], true],
    [[30, 30], false],
    [[0], false],
  ])('pcts %j valid=%p', (pcts, valid) => {
    expect(validateOwnershipTotal(pcts.map((p) => ({ ownershipPercentage: p }))).valid).toBe(valid);
  });
});

describe('Phase 20 dayBefore edges', () => {
  test.each([
    ['2024-03-01', '2024-02-29'],
    ['2024-01-01', '2023-12-31'],
    ['2025-01-01', '2024-12-31'],
  ])('%s => %s', (input, expected) => {
    expect(dayBefore(input)).toBe(expected);
  });
});

describe('Phase 20 distribution transition matrix', () => {
  const all = Object.keys(DIST_TRANSITIONS);
  test.each(all)('status %s is defined', (status) => {
    expect(Array.isArray(DIST_TRANSITIONS[status])).toBe(true);
  });

  test('CANCELLED has no outs', () => {
    expect(DIST_TRANSITIONS.CANCELLED).toEqual([]);
  });
});

describe('Phase 20 capital call transition matrix', () => {
  test.each(Object.keys(CALL_TRANSITIONS))('status %s', (status) => {
    expect(CALL_TRANSITIONS[status]).toBeDefined();
  });
});

describe('Phase 20 capital account zero movements', () => {
  test('opening only', () => {
    expect(computeCapitalAccountClosing({ openingBalance: 42 })).toBe(42);
  });
  test('loss reduces', () => {
    expect(
      computeCapitalAccountClosing({
        openingBalance: 100,
        allocatedLoss: 40,
      })
    ).toBe(60);
  });
  test('income and gain', () => {
    expect(
      computeCapitalAccountClosing({
        openingBalance: 0,
        allocatedIncome: 10,
        allocatedGain: 15,
      })
    ).toBe(25);
  });
});

describe('Phase 20 partner statement null capital', () => {
  test('handles missing capital account', () => {
    const s = partnerStatement({
      investor: { investor_code: 'C1', legal_name: 'Co' },
      capitalAccount: null,
      ownership: null,
      distributions: [],
    });
    expect(s.capitalAccount).toBeNull();
    expect(s.legalName).toBe('Co');
  });
});

describe('Phase 20 waterfall catch-up identity', () => {
  // Ideal: after preferred P and catch-up C, GP share of (P+C) = carry% => C = P*c/(1-c)
  test.each([
    [100, 20, 25],
    [200, 20, 50],
    [80, 25, round2((80 * 0.25) / 0.75)],
  ])('preferred %i at %i%% catch-up %p', (pref, carry, catchUp) => {
    const r = runWaterfall({
      mode: 'WATERFALL',
      distributable: pref + catchUp + 1000,
      lps: [{ investorId: 1, ownershipPercentage: 100 }],
      preferredPool: pref,
      carryPercent: carry,
      gpInvestorId: 2,
    });
    expect(r.summary.catchUpPaid).toBe(catchUp);
  });
});

describe('Phase 20 ownership asOf empty', () => {
  test('no history', () => {
    expect(ownershipAsOf([], '2024-01-01')).toEqual([]);
  });
  test('future effective ignored', () => {
    expect(
      ownershipAsOf(
        [{ investorId: 1, ownershipPercentage: 100, effectiveFrom: '2025-01-01', status: 'ACTIVE' }],
        '2024-01-01'
      )
    ).toHaveLength(0);
  });
});
