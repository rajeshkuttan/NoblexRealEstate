'use strict';

const {
  round2,
  round6,
  absDiff,
  withinTolerance,
  daysBetween,
  matchScore,
  classifyMatch,
  runMatchingEngine,
  summarizeMatchLines,
  manualMatch,
  manyToOneMatch,
  oneToManyMatch,
  DEFAULT_CLOSE_CHECKLIST,
  buildChecklist,
  checklistReady,
  canClosePeriod,
  isPeriodLocked,
  assertPeriodOpen,
  canTransitionReconBatch,
  canTransitionClose,
  BATCH_TRANSITIONS,
  CLOSE_TRANSITIONS,
} = require('../../services/investment/reconciliation/reconEngine.service');

describe('Phase 22 math helpers', () => {
  test('round2', () => expect(round2(1.005)).toBe(1.01));
  test('round6', () => expect(round6(0.1234567)).toBe(0.123457));
  test('absDiff', () => expect(absDiff(10, 7.5)).toBe(2.5));
  test('withinTolerance exact', () => expect(withinTolerance(100, 100.01, 0.01)).toBe(true));
  test('withinTolerance fail', () => expect(withinTolerance(100, 100.05, 0.01)).toBe(false));
  test('daysBetween same', () => expect(daysBetween('2026-07-01', '2026-07-01')).toBe(0));
  test('daysBetween span', () => expect(daysBetween('2026-07-01', '2026-07-04')).toBe(3));
  test('daysBetween null', () => expect(daysBetween(null, '2026-07-01')).toBeNull());
});

describe('Phase 22 matchScore', () => {
  test('reference match scores high', () => {
    const { score, reasons } = matchScore(
      { sourceReference: 'TRD-1', actualAmount: 100 },
      { internalReference: 'TRD-1', expectedAmount: 100 }
    );
    expect(score).toBeGreaterThanOrEqual(150);
    expect(reasons).toContain('REFERENCE');
    expect(reasons).toContain('AMOUNT_EXACT');
  });

  test('instrument + amount without ref', () => {
    const { score, reasons } = matchScore(
      { instrumentId: 5, actualAmount: 50, actualQuantity: 2 },
      { instrumentId: 5, expectedAmount: 50, expectedQuantity: 2 }
    );
    expect(score).toBeGreaterThanOrEqual(100);
    expect(reasons).toContain('INSTRUMENT');
  });

  test('near amount scores lower', () => {
    const { score, reasons } = matchScore(
      { actualAmount: 100 },
      { expectedAmount: 100.05 },
      { amountTolerance: 0.01 }
    );
    expect(reasons).toContain('AMOUNT_NEAR');
    expect(score).toBeLessThan(50);
  });

  test('date exact and tolerance', () => {
    const exact = matchScore(
      { actualAmount: 10, lineDate: '2026-07-01' },
      { expectedAmount: 10, lineDate: '2026-07-01' }
    );
    expect(exact.reasons).toContain('DATE_EXACT');
    const tol = matchScore(
      { actualAmount: 10, lineDate: '2026-07-01' },
      { expectedAmount: 10, lineDate: '2026-07-03' },
      { dateToleranceDays: 3 }
    );
    expect(tol.reasons).toContain('DATE_TOL');
  });

  test('snake_case fields work', () => {
    const { reasons } = matchScore(
      { source_reference: 'A', actual_amount: 1 },
      { internal_reference: 'A', expected_amount: 1 }
    );
    expect(reasons).toContain('REFERENCE');
  });
});

describe('Phase 22 classifyMatch', () => {
  test('matched on high score', () => {
    expect(classifyMatch(160, ['REFERENCE', 'AMOUNT_EXACT']).matchStatus).toBe('MATCHED');
  });
  test('matched on ref+qty', () => {
    expect(classifyMatch(130, ['REFERENCE', 'QUANTITY']).matchMethod).toBe('REFERENCE');
  });
  test('partial', () => {
    expect(classifyMatch(90, ['INSTRUMENT', 'AMOUNT_EXACT']).matchStatus).toBe('PARTIAL');
  });
  test('exception', () => {
    expect(classifyMatch(50, ['INSTRUMENT']).matchStatus).toBe('EXCEPTION');
  });
  test('unmatched', () => {
    expect(classifyMatch(10, []).matchStatus).toBe('UNMATCHED');
  });
});

describe('Phase 22 runMatchingEngine', () => {
  const sources = [
    { sourceReference: 'S1', instrumentId: 1, actualAmount: 100, actualQuantity: 10, lineDate: '2026-07-01' },
    { sourceReference: 'S2', instrumentId: 2, actualAmount: 200, actualQuantity: 5, lineDate: '2026-07-02' },
    { sourceReference: 'ORPHAN', actualAmount: 50 },
  ];
  const internals = [
    { internalReference: 'S1', instrumentId: 1, expectedAmount: 100, expectedQuantity: 10, lineDate: '2026-07-01' },
    { internalReference: 'S2', instrumentId: 2, expectedAmount: 200.005, expectedQuantity: 5, lineDate: '2026-07-02' },
    { internalReference: 'MISSING', expectedAmount: 999 },
  ];

  test('matches by reference', () => {
    const { lines, summary } = runMatchingEngine(sources, internals, { amountTolerance: 0.01 });
    expect(summary.matchedRecords).toBeGreaterThanOrEqual(2);
    expect(lines.some((l) => l.matchStatus === 'UNMATCHED')).toBe(true);
  });

  test('summary counts total', () => {
    const { summary } = runMatchingEngine(sources, internals);
    expect(summary.totalRecords).toBeGreaterThanOrEqual(3);
    expect(summary.matchRate).toBeGreaterThanOrEqual(0);
  });

  test('empty inputs', () => {
    const { lines, summary } = runMatchingEngine([], []);
    expect(lines).toHaveLength(0);
    expect(summary.matchedRecords).toBe(0);
  });

  test('unmatched source only', () => {
    const { lines } = runMatchingEngine([{ actualAmount: 1 }], []);
    expect(lines[0].matchStatus).toBe('UNMATCHED');
    expect(lines[0].actualAmount).toBe(1);
  });

  test('unmatched internal only', () => {
    const { lines } = runMatchingEngine([], [{ expectedAmount: 5 }]);
    expect(lines[0].matchStatus).toBe('UNMATCHED');
    expect(lines[0].expectedAmount).toBe(5);
  });

  test('minScore filters weak pairs', () => {
    const { summary } = runMatchingEngine(
      [{ instrumentId: 1, actualAmount: 999 }],
      [{ instrumentId: 1, expectedAmount: 1 }],
      { minScore: 200 }
    );
    expect(summary.matchedRecords).toBe(0);
  });

  test('difference amounts computed', () => {
    const { lines } = runMatchingEngine(
      [{ sourceReference: 'X', actualAmount: 105 }],
      [{ internalReference: 'X', expectedAmount: 100 }]
    );
    const matched = lines.find((l) => l.matchStatus === 'MATCHED' || l.matchStatus === 'PARTIAL');
    expect(matched.differenceAmount).toBe(5);
  });
});

describe('Phase 22 summarizeMatchLines', () => {
  test('counts statuses', () => {
    const s = summarizeMatchLines([
      { matchStatus: 'MATCHED' },
      { matchStatus: 'MATCHED' },
      { matchStatus: 'EXCEPTION' },
      { matchStatus: 'PARTIAL' },
      { matchStatus: 'RESOLVED' },
    ]);
    expect(s.matchedRecords).toBe(2);
    expect(s.exceptionRecords).toBe(2);
    expect(s.resolvedRecords).toBe(1);
    expect(s.matchRate).toBe(40);
  });
});

describe('Phase 22 manual / split match', () => {
  test('manualMatch forces MATCHED', () => {
    const r = manualMatch(
      { sourceReference: 'A', actualAmount: 10 },
      { internalReference: 'B', expectedAmount: 99 }
    );
    expect(r.matchStatus).toBe('MATCHED');
    expect(r.matchMethod).toBe('MANUAL');
    expect(r.reasons).toContain('MANUAL');
  });

  test('manyToOne exact', () => {
    const r = manyToOneMatch(
      [{ actualAmount: 40 }, { actualAmount: 60 }],
      { expectedAmount: 100 }
    );
    expect(r.matchStatus).toBe('MATCHED');
    expect(r.matchMethod).toBe('MANY_TO_ONE');
    expect(r.actualAmount).toBe(100);
  });

  test('manyToOne partial', () => {
    const r = manyToOneMatch([{ amount: 30 }, { amount: 30 }], { amount: 100 });
    expect(r.matchStatus).toBe('PARTIAL');
    expect(r.differenceAmount).toBe(-40);
  });

  test('oneToMany exact', () => {
    const r = oneToManyMatch({ actualAmount: 90 }, [
      { expectedAmount: 40 },
      { expectedAmount: 50 },
    ]);
    expect(r.matchStatus).toBe('MATCHED');
    expect(r.matchMethod).toBe('ONE_TO_MANY');
  });

  test('oneToMany partial', () => {
    const r = oneToManyMatch({ amount: 100 }, [{ amount: 10 }]);
    expect(r.matchStatus).toBe('PARTIAL');
  });
});

describe('Phase 22 checklist', () => {
  test('DEFAULT has recon items', () => {
    const keys = DEFAULT_CLOSE_CHECKLIST.map((i) => i.key);
    expect(keys).toContain('bank_recon');
    expect(keys).toContain('broker_recon');
    expect(keys).toContain('custodian_recon');
    expect(keys).toContain('subledger_gl');
    expect(keys).toContain('period_lock');
  });

  test('buildChecklist default not done', () => {
    const c = buildChecklist();
    expect(c.every((i) => !i.done)).toBe(true);
  });

  test('buildChecklist overrides', () => {
    const c = buildChecklist({ bank_recon: true });
    expect(c.find((i) => i.key === 'bank_recon').done).toBe(true);
  });

  test('checklistReady false when incomplete', () => {
    expect(checklistReady(buildChecklist()).ready).toBe(false);
  });

  test('checklistReady true when required done', () => {
    const c = buildChecklist();
    const filled = c.map((i) => (i.required ? { ...i, done: true } : i));
    expect(checklistReady(filled).ready).toBe(true);
  });

  test('canClosePeriod ignores period_lock required', () => {
    const c = buildChecklist().map((i) =>
      i.key === 'period_lock' ? i : i.required ? { ...i, done: true } : i
    );
    expect(canClosePeriod('OPEN', c)).toBe(true);
  });

  test('canClosePeriod false when status CLOSED', () => {
    const c = buildChecklist().map((i) => ({ ...i, done: true }));
    expect(canClosePeriod('CLOSED', c)).toBe(false);
  });

  test('canClosePeriod allows REOPENED', () => {
    const c = buildChecklist().map((i) =>
      i.key === 'period_lock' ? i : i.required ? { ...i, done: true } : i
    );
    expect(canClosePeriod('REOPENED', c)).toBe(true);
  });
});

describe('Period lock helpers', () => {
  test('isPeriodLocked', () => {
    expect(isPeriodLocked({ status: 'CLOSED' })).toBe(true);
    expect(isPeriodLocked({ status: 'OPEN' })).toBe(false);
    expect(isPeriodLocked(null)).toBe(false);
  });

  test('assertPeriodOpen throws when locked', () => {
    expect(() => assertPeriodOpen({ status: 'CLOSED' }, 'post')).toThrow(/locked/i);
    try {
      assertPeriodOpen({ status: 'CLOSED' });
    } catch (e) {
      expect(e.statusCode).toBe(423);
      expect(e.code).toBe('PERIOD_LOCKED');
    }
  });

  test('assertPeriodOpen ok when open', () => {
    expect(() => assertPeriodOpen({ status: 'OPEN' })).not.toThrow();
  });
});

describe('Phase 22 transitions', () => {
  test('recon DRAFT to IMPORTED', () => {
    expect(canTransitionReconBatch('DRAFT', 'IMPORTED')).toBe(true);
  });
  test('recon MATCHED to APPROVED', () => {
    expect(canTransitionReconBatch('MATCHED', 'APPROVED')).toBe(true);
  });
  test('recon CLOSED terminal', () => {
    expect(canTransitionReconBatch('CLOSED', 'APPROVED')).toBe(false);
    expect(BATCH_TRANSITIONS.CLOSED).toEqual([]);
  });
  test('recon EXCEPTION back to MATCHING', () => {
    expect(canTransitionReconBatch('EXCEPTION', 'MATCHING')).toBe(true);
  });
  test('close OPEN to CLOSED', () => {
    expect(canTransitionClose('OPEN', 'CLOSED')).toBe(true);
  });
  test('close CLOSED to REOPENED', () => {
    expect(canTransitionClose('CLOSED', 'REOPENED')).toBe(true);
  });
  test('close cannot skip from CLOSED to OPEN', () => {
    expect(canTransitionClose('CLOSED', 'OPEN')).toBe(false);
  });
  test('CLOSE_TRANSITIONS REOPENED includes CLOSED', () => {
    expect(CLOSE_TRANSITIONS.REOPENED).toContain('CLOSED');
  });
});

describe('Phase 22 recon type coverage', () => {
  const types = ['BROKER', 'CUSTODIAN', 'BANK', 'INCOME', 'SUBLEDGER_GL', 'OWNERSHIP_CAPITAL', 'VALUATION'];
  test.each(types)('engine accepts %s-style rows', (type) => {
    const { summary } = runMatchingEngine(
      [{ sourceReference: `${type}-1`, actualAmount: 10, instrumentId: 1 }],
      [{ internalReference: `${type}-1`, expectedAmount: 10, instrumentId: 1 }]
    );
    expect(summary.matchedRecords).toBe(1);
  });
});

describe('Phase 22 tolerance edge cases', () => {
  test('quantity tolerance', () => {
    const { score, reasons } = matchScore(
      { actualQuantity: 100.0000005, actualAmount: 1 },
      { expectedQuantity: 100, expectedAmount: 1 },
      { quantityTolerance: 0.000001 }
    );
    expect(reasons).toContain('QUANTITY');
    expect(score).toBeGreaterThan(0);
  });

  test('zero amounts match', () => {
    const { lines } = runMatchingEngine(
      [{ sourceReference: 'Z', actualAmount: 0 }],
      [{ internalReference: 'Z', expectedAmount: 0 }]
    );
    expect(lines[0].matchStatus).toBe('MATCHED');
  });

  test('greedy does not double-assign', () => {
    const { lines } = runMatchingEngine(
      [
        { sourceReference: 'A', actualAmount: 10 },
        { sourceReference: 'B', actualAmount: 10 },
      ],
      [{ internalReference: 'A', expectedAmount: 10 }]
    );
    const matched = lines.filter((l) => l.matchStatus === 'MATCHED');
    expect(matched).toHaveLength(1);
    expect(lines.filter((l) => l.matchStatus === 'UNMATCHED').length).toBeGreaterThanOrEqual(1);
  });
});

describe('Phase 22 reopen reason validation shape', () => {
  test('reopen transition requires CLOSED first', () => {
    expect(canTransitionClose('IN_PROGRESS', 'REOPENED')).toBe(false);
    expect(canTransitionClose('CLOSED', 'REOPENED')).toBe(true);
  });
});

describe('Phase 22 match rate math', () => {
  test('100% when all matched', () => {
    const s = summarizeMatchLines([{ matchStatus: 'MATCHED' }, { matchStatus: 'MATCHED' }]);
    expect(s.matchRate).toBe(100);
  });
  test('0% empty', () => {
    expect(summarizeMatchLines([]).matchRate).toBe(0);
  });
});

describe('Phase 22 batch status matrix', () => {
  test.each([
    ['DRAFT', 'CANCELLED'],
    ['IMPORTED', 'MATCHING'],
    ['MATCHING', 'MATCHED'],
    ['MATCHING', 'EXCEPTION'],
    ['EXCEPTION', 'APPROVED'],
    ['APPROVED', 'CLOSED'],
  ])('%s → %s allowed', (from, to) => {
    expect(canTransitionReconBatch(from, to)).toBe(true);
  });

  test.each([
    ['APPROVED', 'DRAFT'],
    ['CANCELLED', 'IMPORTED'],
    ['CLOSED', 'EXCEPTION'],
  ])('%s → %s blocked', (from, to) => {
    expect(canTransitionReconBatch(from, to)).toBe(false);
  });
});

describe('Phase 22 close status matrix', () => {
  test.each([
    ['OPEN', 'IN_PROGRESS'],
    ['OPEN', 'READY'],
    ['IN_PROGRESS', 'READY'],
    ['READY', 'CLOSED'],
    ['REOPENED', 'IN_PROGRESS'],
  ])('%s → %s allowed', (from, to) => {
    expect(canTransitionClose(from, to)).toBe(true);
  });
});

describe('Phase 22 readiness counts', () => {
  test('reports required vs done', () => {
    const c = buildChecklist({ bank_recon: true, broker_recon: true });
    const r = checklistReady(c);
    expect(r.doneRequiredCount).toBe(2);
    expect(r.requiredCount).toBeGreaterThan(2);
    expect(r.total).toBe(DEFAULT_CLOSE_CHECKLIST.length);
  });
});
