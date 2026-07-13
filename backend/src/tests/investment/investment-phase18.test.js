'use strict';

const {
  round2,
  round4,
  availableLotQuantity,
  allocateSellLots,
  computeRealizedGainLoss,
  applyFeeAllocation,
  computeBuyLot,
  computeTradeAmounts,
  nextOrderStatus,
  canTransitionOrder,
  canTransitionSettlement,
  previewJournal,
  ORDER_TRANSITIONS,
  SETTLEMENT_TRANSITIONS,
} = require('../../services/investment/orders/costBasis.service');

describe('Phase 18 cost basis — rounding', () => {
  test('round2 with epsilon', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(1.004)).toBe(1);
  });
  test('round4', () => {
    expect(round4(1.23456)).toBe(1.2346);
  });
});

describe('Phase 18 available quantity', () => {
  test('sums open lots only', () => {
    const lots = [
      { status: 'OPEN', remainingQuantity: 10 },
      { status: 'CLOSED', remainingQuantity: 5 },
      { status: 'OPEN', remainingQuantity: 2.5 },
    ];
    expect(availableLotQuantity(lots)).toBe(12.5);
  });
  test('empty lots => 0', () => {
    expect(availableLotQuantity([])).toBe(0);
    expect(availableLotQuantity(null)).toBe(0);
  });
});

describe('Phase 18 FIFO allocation', () => {
  const lots = [
    { id: 1, status: 'OPEN', remainingQuantity: 50, unitCost: 10, openDate: '2024-01-01' },
    { id: 2, status: 'OPEN', remainingQuantity: 50, unitCost: 12, openDate: '2024-06-01' },
  ];

  test('consumes oldest first', () => {
    const a = allocateSellLots(lots, 60, 'FIFO');
    expect(a).toHaveLength(2);
    expect(a[0]).toMatchObject({ lotId: 1, quantity: 50, unitCost: 10 });
    expect(a[1]).toMatchObject({ lotId: 2, quantity: 10, unitCost: 12 });
  });

  test('exact single lot', () => {
    const a = allocateSellLots(lots, 50, 'FIFO');
    expect(a).toHaveLength(1);
    expect(a[0].lotId).toBe(1);
  });

  test('oversell throws OVERSELL', () => {
    expect(() => allocateSellLots(lots, 101, 'FIFO')).toThrow(/Insufficient/);
    try {
      allocateSellLots(lots, 101, 'FIFO');
    } catch (e) {
      expect(e.code).toBe('OVERSELL');
      expect(e.statusCode).toBe(400);
    }
  });

  test('zero qty throws', () => {
    expect(() => allocateSellLots(lots, 0, 'FIFO')).toThrow(/positive/);
  });
});

describe('Phase 18 AVERAGE allocation', () => {
  const lots = [
    { id: 1, status: 'OPEN', remainingQuantity: 100, unitCost: 10, totalCost: 1000, openDate: '2024-01-01' },
    { id: 2, status: 'OPEN', remainingQuantity: 100, unitCost: 14, totalCost: 1400, openDate: '2024-02-01' },
  ];

  test('uses weighted average unit cost', () => {
    const a = allocateSellLots(lots, 50, 'AVERAGE');
    expect(a[0].unitCost).toBe(12);
    expect(a[0].cost).toBe(600);
  });

  test('still reduces oldest lots for tracking', () => {
    const a = allocateSellLots(lots, 120, 'AVERAGE');
    expect(a[0].lotId).toBe(1);
    expect(a[0].quantity).toBe(100);
    expect(a[1].lotId).toBe(2);
    expect(a[1].quantity).toBe(20);
  });
});

describe('Phase 18 SPECIFIC lot identification', () => {
  const lots = [
    { id: 10, status: 'OPEN', remainingQuantity: 40, unitCost: 8, openDate: '2024-01-01' },
    { id: 11, status: 'OPEN', remainingQuantity: 40, unitCost: 15, openDate: '2024-03-01' },
  ];

  test('requires selections', () => {
    expect(() => allocateSellLots(lots, 10, 'SPECIFIC', [])).toThrow(/Specific lot/);
  });

  test('allocates chosen lots', () => {
    const a = allocateSellLots(lots, 30, 'SPECIFIC', [{ lotId: 11, quantity: 30 }]);
    expect(a).toHaveLength(1);
    expect(a[0].lotId).toBe(11);
    expect(a[0].unitCost).toBe(15);
  });

  test('rejects over-lot selection', () => {
    expect(() =>
      allocateSellLots(lots, 50, 'SPECIFIC', [{ lotId: 10, quantity: 50 }])
    ).toThrow(/only 40/);
  });

  test('rejects incomplete coverage', () => {
    expect(() =>
      allocateSellLots(lots, 30, 'SPECIFIC', [{ lotId: 10, quantity: 20 }])
    ).toThrow(/cover sell/);
  });

  test('rejects missing lot', () => {
    expect(() =>
      allocateSellLots(lots, 5, 'SPECIFIC', [{ lotId: 999, quantity: 5 }])
    ).toThrow(/not found/);
  });
});

describe('Phase 18 realized G/L', () => {
  test('gain on sell', () => {
    const alloc = [{ cost: 1000, quantity: 100, unitCost: 10 }];
    const r = computeRealizedGainLoss(alloc, 12, 100, 0);
    expect(r.proceeds).toBe(1200);
    expect(r.costBasis).toBe(1000);
    expect(r.realizedGainLoss).toBe(200);
  });

  test('loss with fees', () => {
    const alloc = [{ cost: 1000, quantity: 100, unitCost: 10 }];
    const r = computeRealizedGainLoss(alloc, 10, 100, 50);
    expect(r.proceeds).toBe(950);
    expect(r.realizedGainLoss).toBe(-50);
  });
});

describe('Phase 18 fee allocation across lots', () => {
  test('splits fees by quantity', () => {
    const withFees = applyFeeAllocation(
      [
        { lotId: 1, quantity: 75, cost: 750 },
        { lotId: 2, quantity: 25, cost: 300 },
      ],
      100
    );
    expect(withFees[0].feeShare).toBe(75);
    expect(withFees[1].feeShare).toBe(25);
  });

  test('zero fees', () => {
    const withFees = applyFeeAllocation([{ quantity: 10, cost: 100 }], 0);
    expect(withFees[0].feeShare).toBe(0);
  });
});

describe('Phase 18 buy lot', () => {
  test('capitalizes fees into unit cost', () => {
    const buy = computeBuyLot(100, 10, 50);
    expect(buy.gross).toBe(1000);
    expect(buy.totalCost).toBe(1050);
    expect(buy.unitCost).toBe(10.5);
  });
});

describe('Phase 18 trade amounts', () => {
  test('BUY nets gross + charges', () => {
    const a = computeTradeAmounts({
      side: 'BUY',
      quantity: 10,
      price: 100,
      commission: 5,
      fees: 3,
      taxes: 2,
      withholdingTax: 1,
    });
    expect(a.grossAmount).toBe(1000);
    expect(a.charges).toBe(11);
    expect(a.netSettlement).toBe(1011);
  });

  test('SELL nets gross - charges', () => {
    const a = computeTradeAmounts({
      side: 'SELL',
      quantity: 10,
      price: 100,
      commission: 5,
      fees: 5,
    });
    expect(a.netSettlement).toBe(990);
  });

  test('applies FX to base', () => {
    const a = computeTradeAmounts({
      side: 'BUY',
      quantity: 1,
      price: 100,
      exchangeRate: 3.67,
    });
    expect(a.baseCurrencyNet).toBe(round2(100 * 3.67));
  });

  const amountCases = [
    ['BUY', 1, 50, 0, 50],
    ['BUY', 2, 50, 10, 110],
    ['SELL', 2, 50, 10, 90],
    ['SELL', 100, 1.5, 0, 150],
  ];
  test.each(amountCases)('side=%s qty=%i px=%i charges=%i => net=%i', (side, qty, px, ch, net) => {
    const a = computeTradeAmounts({
      side,
      quantity: qty,
      price: px,
      commission: ch,
    });
    expect(a.netSettlement).toBe(net);
  });
});

describe('Phase 18 order status from execution', () => {
  test('partial', () => {
    expect(nextOrderStatus(100, 40)).toBe('PARTIALLY_EXECUTED');
  });
  test('full', () => {
    expect(nextOrderStatus(100, 100)).toBe('EXECUTED');
  });
  test('none', () => {
    expect(nextOrderStatus(100, 0)).toBeNull();
  });
  test('overfill treated as executed', () => {
    expect(nextOrderStatus(100, 105)).toBe('EXECUTED');
  });
});

describe('Phase 18 order transitions', () => {
  const allowed = [
    ['DRAFT', 'SUBMITTED'],
    ['DRAFT', 'CANCELLED'],
    ['SUBMITTED', 'APPROVED'],
    ['SUBMITTED', 'REJECTED'],
    ['APPROVED', 'PLACED'],
    ['PLACED', 'PARTIALLY_EXECUTED'],
    ['PLACED', 'EXECUTED'],
    ['PARTIALLY_EXECUTED', 'EXECUTED'],
  ];
  test.each(allowed)('%s → %s allowed', (from, to) => {
    expect(canTransitionOrder(from, to)).toBe(true);
  });

  const blocked = [
    ['DRAFT', 'EXECUTED'],
    ['EXECUTED', 'CANCELLED'],
    ['CANCELLED', 'DRAFT'],
    ['REJECTED', 'APPROVED'],
    ['EXPIRED', 'PLACED'],
  ];
  test.each(blocked)('%s → %s blocked', (from, to) => {
    expect(canTransitionOrder(from, to)).toBe(false);
  });

  test('ORDER_TRANSITIONS covers all statuses', () => {
    const statuses = [
      'DRAFT',
      'SUBMITTED',
      'APPROVED',
      'REJECTED',
      'PLACED',
      'PARTIALLY_EXECUTED',
      'EXECUTED',
      'EXPIRED',
      'CANCELLED',
    ];
    statuses.forEach((s) => expect(ORDER_TRANSITIONS[s]).toBeDefined());
  });
});

describe('Phase 18 settlement transitions', () => {
  const allowed = [
    ['PENDING', 'SETTLED'],
    ['PENDING', 'FAILED'],
    ['PENDING', 'PARTIALLY_SETTLED'],
    ['PARTIALLY_SETTLED', 'SETTLED'],
    ['SETTLED', 'REVERSED'],
    ['FAILED', 'PENDING'],
  ];
  test.each(allowed)('%s → %s allowed', (from, to) => {
    expect(canTransitionSettlement(from, to)).toBe(true);
  });

  const blocked = [
    ['SETTLED', 'FAILED'],
    ['CANCELLED', 'SETTLED'],
    ['REVERSED', 'SETTLED'],
  ];
  test.each(blocked)('%s → %s blocked', (from, to) => {
    expect(canTransitionSettlement(from, to)).toBe(false);
  });

  test('SETTLEMENT_TRANSITIONS defined', () => {
    expect(Object.keys(SETTLEMENT_TRANSITIONS).length).toBeGreaterThanOrEqual(6);
  });
});

describe('Phase 18 journal preview', () => {
  test('BUY journal', () => {
    const j = previewJournal(
      { side: 'BUY' },
      { grossAmount: 1000, charges: 20, netSettlement: 1020 },
      'TRADE_DATE'
    );
    expect(j.postingTrigger).toBe('On trade confirm');
    expect(j.lines.some((l) => l.debit === 1000)).toBe(true);
    expect(j.lines.some((l) => l.credit === 1020)).toBe(true);
  });

  test('SELL with gain', () => {
    const j = previewJournal(
      { side: 'SELL', realizedGainLoss: 100, costBasis: 900 },
      { netSettlement: 1000 },
      'SETTLEMENT_DATE'
    );
    expect(j.postingTrigger).toBe('On settlement');
    expect(j.lines.some((l) => l.account === 'Realized gain')).toBe(true);
  });

  test('SELL with loss', () => {
    const j = previewJournal(
      { side: 'SELL', realizedGainLoss: -50, costBasis: 1050 },
      { netSettlement: 1000 },
      'TRADE_DATE'
    );
    expect(j.lines.some((l) => l.account === 'Realized loss')).toBe(true);
  });
});

describe('Phase 18 oversell matrix', () => {
  const base = [
    { id: 1, status: 'OPEN', remainingQuantity: 10, unitCost: 5, openDate: '2025-01-01' },
  ];
  const cases = [
    [10, true],
    [10.0001, false],
    [9.999, true],
    [0, false],
    [11, false],
  ];
  test.each(cases)('sell %p succeeds=%p', (qty, ok) => {
    if (ok && qty > 0) {
      expect(() => allocateSellLots(base, qty, 'FIFO')).not.toThrow();
    } else {
      expect(() => allocateSellLots(base, qty, 'FIFO')).toThrow();
    }
  });
});

describe('Phase 18 multi-lot FIFO scenarios', () => {
  const lots = [
    { id: 1, status: 'OPEN', remainingQuantity: 25, unitCost: 1, openDate: '2023-01-01' },
    { id: 2, status: 'OPEN', remainingQuantity: 25, unitCost: 2, openDate: '2023-02-01' },
    { id: 3, status: 'OPEN', remainingQuantity: 25, unitCost: 3, openDate: '2023-03-01' },
    { id: 4, status: 'OPEN', remainingQuantity: 25, unitCost: 4, openDate: '2023-04-01' },
  ];

  test.each([
    [10, 1, 1],
    [25, 1, 1],
    [26, 2, 1],
    [75, 3, 1],
    [100, 4, 1],
  ])('qty=%i uses %i lots', (qty, lotCount) => {
    const a = allocateSellLots(lots, qty, 'FIFO');
    expect(a).toHaveLength(lotCount);
  });

  test('FIFO cost for 50 units', () => {
    const a = allocateSellLots(lots, 50, 'FIFO');
    const cost = a.reduce((s, x) => s + x.cost, 0);
    expect(cost).toBe(75); // 25*1 + 25*2
  });
});

describe('Phase 18 AVERAGE vs FIFO G/L divergence', () => {
  const lots = [
    { id: 1, status: 'OPEN', remainingQuantity: 50, unitCost: 10, totalCost: 500, openDate: '2024-01-01' },
    { id: 2, status: 'OPEN', remainingQuantity: 50, unitCost: 20, totalCost: 1000, openDate: '2024-06-01' },
  ];

  test('FIFO sell 50 @ 18', () => {
    const a = allocateSellLots(lots, 50, 'FIFO');
    const gl = computeRealizedGainLoss(a, 18, 50, 0);
    expect(gl.costBasis).toBe(500);
    expect(gl.realizedGainLoss).toBe(400);
  });

  test('AVERAGE sell 50 @ 18', () => {
    const a = allocateSellLots(lots, 50, 'AVERAGE');
    const gl = computeRealizedGainLoss(a, 18, 50, 0);
    expect(gl.costBasis).toBe(750);
    expect(gl.realizedGainLoss).toBe(150);
  });
});

describe('Phase 18 snake_case lot fields', () => {
  test('reads remaining_quantity and unit_cost', () => {
    const lots = [{ id: 1, status: 'OPEN', remaining_quantity: 5, unit_cost: 3, open_date: '2024-01-01' }];
    const a = allocateSellLots(lots, 5, 'FIFO');
    expect(a[0].unitCost).toBe(3);
  });
});

describe('Phase 18 accrued interest in amounts', () => {
  test('BUY includes accrued', () => {
    const a = computeTradeAmounts({
      side: 'BUY',
      quantity: 1,
      price: 100,
      accruedInterest: 2.5,
    });
    expect(a.netSettlement).toBe(102.5);
  });
  test('SELL includes accrued', () => {
    const a = computeTradeAmounts({
      side: 'SELL',
      quantity: 1,
      price: 100,
      accruedInterest: 2.5,
      commission: 1,
    });
    expect(a.netSettlement).toBe(101.5);
  });
});
