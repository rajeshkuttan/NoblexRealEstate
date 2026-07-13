'use strict';

const {
  round2,
  parseJson,
  REPORT_CATALOG,
  getReportDefinition,
  listReportsByCategory,
  groupByDimension,
  buildMaturityLadder,
  shapeReport,
  exportPayload,
  computeExecutiveCards,
  filterCardsForRole,
  WORK_QUEUE_TYPES,
  buildWorkQueueItem,
  summarizeWorkQueue,
  nextScheduleRun,
  canRunSchedule,
  COPILOT_TOOLS,
  assertCopilotTool,
  assertCopilotPermission,
  groundCopilotResponse,
  explainNavMovement,
  explainRealizedGainLoss,
  compareToBenchmark,
} = require('../../services/investment/intelligence/intelligenceEngine.service');

describe('Phase 24 catalog', () => {
  test('has 50+ reports', () => {
    expect(REPORT_CATALOG.length).toBeGreaterThanOrEqual(50);
  });
  test('categories present', () => {
    const cats = new Set(REPORT_CATALOG.map((r) => r.category));
    expect(cats.has('PORTFOLIO')).toBe(true);
    expect(cats.has('PERFORMANCE')).toBe(true);
    expect(cats.has('OPERATIONS')).toBe(true);
    expect(cats.has('ACCOUNTING')).toBe(true);
    expect(cats.has('PARTNER')).toBe(true);
    expect(cats.has('RISK')).toBe(true);
  });
  test('getReportDefinition', () => {
    expect(getReportDefinition('TWR').name).toBe('TWR');
    expect(getReportDefinition('nope')).toBeNull();
  });
  test('listReportsByCategory', () => {
    expect(listReportsByCategory('RISK').every((r) => r.category === 'RISK')).toBe(true);
    expect(listReportsByCategory().length).toBe(REPORT_CATALOG.length);
  });
});

describe('Phase 24 grouping / ladder', () => {
  const holdings = [
    { marketValue: 700, assetClass: 'EQUITY', currencyCode: 'AED', maturityDate: '2026-07-20' },
    { marketValue: 300, assetClass: 'FI', currencyCode: 'USD', maturityDate: null },
  ];
  test('groupByDimension', () => {
    const g = groupByDimension(holdings, (h) => h.assetClass);
    expect(g.find((x) => x.key === 'EQUITY').pct).toBe(70);
  });
  test('maturity ladder', () => {
    const ladder = buildMaturityLadder(holdings, '2026-07-01');
    expect(ladder.find((x) => x.key === '0_30').value).toBe(700);
    expect(ladder.find((x) => x.key === 'OPEN_ENDED').value).toBe(300);
  });
  test('round2', () => expect(round2(1.005)).toBe(1.01));
  test('parseJson', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 });
    expect(parseJson('bad', [])).toEqual([]);
  });
});

describe('Phase 24 shapeReport / export', () => {
  test('shapes known report', () => {
    const r = shapeReport('PORTFOLIO_SUMMARY', { rows: [{ a: 1 }], filters: { p: 1 } });
    expect(r.reportCode).toBe('PORTFOLIO_SUMMARY');
    expect(r.rows).toHaveLength(1);
    expect(r.summary.rowCount).toBe(1);
  });
  test('unknown report throws', () => {
    expect(() => shapeReport('NOPE', {})).toThrow(/Unknown report/);
  });
  test('export CSV', () => {
    const r = shapeReport('TWR', { rows: [{ x: 1, y: 2 }], columns: [{ key: 'x' }, { key: 'y' }] });
    const exp = exportPayload(r, 'CSV');
    expect(exp.format).toBe('CSV');
    expect(exp.content).toContain('x,y');
  });
  test('export JSON default', () => {
    expect(exportPayload(shapeReport('IRR', { rows: [] }), 'JSON').format).toBe('JSON');
  });
  test('export PDF is deferred for async materialize', () => {
    const exp = exportPayload(shapeReport('MWR', { rows: [] }), 'PDF');
    expect(exp.stub).toBe(false);
    expect(exp.deferred).toBe(true);
    expect(exp.format).toBe('PDF');
  });
  test('export EXCEL is deferred for async materialize', () => {
    const exp = exportPayload(shapeReport('IRR', { rows: [{ a: 1 }] }), 'EXCEL');
    expect(exp.deferred).toBe(true);
    expect(exp.format).toBe('EXCEL');
  });
});

describe('Phase 24 executive cards', () => {
  test('compute cards', () => {
    const c = computeExecutiveCards({ marketValue: 100, investedCapital: 80, riskBreaches: 2 });
    expect(c.marketValue).toBe(100);
    expect(c.riskBreaches).toBe(2);
  });
  test('partner role hides sensitive', () => {
    const c = filterCardsForRole(
      computeExecutiveCards({ unfundedCommitment: 50, distributionPayable: 10, marketValue: 1 }),
      'PARTNER'
    );
    expect(c.unfundedCommitment).toBeUndefined();
    expect(c.marketValue).toBe(1);
  });
  test('investment role keeps all', () => {
    const c = filterCardsForRole(computeExecutiveCards({ unfundedCommitment: 5 }), 'INVESTMENT');
    expect(c.unfundedCommitment).toBe(5);
  });
});

describe('Phase 24 work queue', () => {
  test('all types listed', () => {
    expect(WORK_QUEUE_TYPES).toHaveLength(12);
  });
  test('build item', () => {
    const it = buildWorkQueueItem('RISK_BREACH', { id: 9, title: 'B1', severity: 'HIGH' });
    expect(it.type).toBe('RISK_BREACH');
    expect(it.id).toBe(9);
  });
  test('unknown type throws', () => {
    expect(() => buildWorkQueueItem('NOPE', { id: 1 })).toThrow();
  });
  test('summarize', () => {
    const s = summarizeWorkQueue([
      buildWorkQueueItem('KYC_EXPIRING', { id: 1 }),
      buildWorkQueueItem('KYC_EXPIRING', { id: 2 }),
      buildWorkQueueItem('RISK_BREACH', { id: 3 }),
    ]);
    expect(s.total).toBe(3);
    expect(s.byType.KYC_EXPIRING).toBe(2);
  });
});

describe('Phase 24 schedules', () => {
  test('nextScheduleRun monthly', () => {
    const d = nextScheduleRun('MONTHLY', new Date('2026-01-15T00:00:00Z'));
    expect(d.getUTCMonth()).toBe(1);
  });
  test('nextScheduleRun weekly', () => {
    const from = new Date('2026-01-01T00:00:00Z');
    const d = nextScheduleRun('WEEKLY', from);
    expect(d.getTime() - from.getTime()).toBe(7 * 86400000);
  });
  test('nextScheduleRun daily/quarterly', () => {
    expect(nextScheduleRun('DAILY', new Date('2026-01-01')).getUTCDate()).toBe(2);
    expect(nextScheduleRun('QUARTERLY', new Date('2026-01-01')).getUTCMonth()).toBe(3);
  });
  test('canRunSchedule', () => {
    expect(canRunSchedule({ status: 'ACTIVE', nextRunAt: new Date(Date.now() - 1000) })).toBe(true);
    expect(canRunSchedule({ status: 'PAUSED', nextRunAt: new Date(Date.now() - 1000) })).toBe(false);
    expect(canRunSchedule({ status: 'ACTIVE', nextRunAt: new Date(Date.now() + 86400000) })).toBe(false);
  });
});

describe('Phase 24 copilot tools', () => {
  test('17 tools', () => {
    expect(COPILOT_TOOLS.length).toBe(17);
  });
  test('assertCopilotTool', () => {
    expect(() => assertCopilotTool('getPortfolioSummary')).not.toThrow();
    expect(() => assertCopilotTool('hack')).toThrow(/Unknown/);
  });
  test('permission required', () => {
    expect(() => assertCopilotPermission({ permissions: [] }, 'getPortfolioSummary')).toThrow(/Missing/);
  });
  test('permission ok', () => {
    expect(assertCopilotPermission({ permissions: ['module:investment:view'] }, 'getRiskBreaches')).toBe(true);
  });
  test('partner privacy', () => {
    expect(() =>
      assertCopilotPermission(
        { permissions: ['module:investment:view'], restrictPartnerData: true },
        'getInvestorCapitalAccount'
      )
    ).toThrow(/Partner/);
  });
  test('grounded response', () => {
    const g = groundCopilotResponse('getPortfolioSummary', { mv: 1 }, { companyId: 3 });
    expect(g.grounded).toBe(true);
    expect(g.companyId).toBe(3);
    expect(g.citations[0].source).toBe('erp');
  });
});

describe('Phase 24 explainers', () => {
  test('NAV movement', () => {
    const e = explainNavMovement({
      openingNav: 100,
      closingNav: 120,
      contributions: 10,
      distributions: 0,
      income: 5,
      unrealized: 5,
    });
    expect(e.bridge).toBe(20);
    expect(e.reconcilingDifference).toBe(0);
    expect(e.explanation).toMatch(/NAV moved/);
  });
  test('realized G/L', () => {
    const e = explainRealizedGainLoss({ proceeds: 110, costBasis: 100, fees: 2, fx: 1 });
    expect(e.realizedGainLoss).toBe(9);
  });
  test('benchmark compare', () => {
    const c = compareToBenchmark({ portfolioReturn: 0.12, benchmarkReturn: 0.1 });
    expect(c.excessReturn).toBe(0.02);
    expect(c.outperformed).toBe(true);
  });
});

describe('Phase 24 report code coverage', () => {
  test.each([
    'PORTFOLIO_SUMMARY',
    'HOLDINGS_BY_ASSET_CLASS',
    'HOLDINGS_BY_CURRENCY',
    'HOLDINGS_BY_COUNTRY',
    'HOLDINGS_BY_SECTOR',
    'CONCENTRATION',
    'LIQUIDITY',
    'MATURITY_LADDER',
    'TOTAL_RETURN',
    'TWR',
    'MWR',
    'IRR',
    'ORDER_BLOTTER',
    'TRADE_BLOTTER',
    'FAILED_SETTLEMENTS',
    'SUBLEDGER',
    'REALIZED_GL',
    'UNREALIZED_GL',
    'CAPITAL_ACCOUNT_STATEMENT',
    'BREACH_REGISTER',
    'MANDATE_COMPLIANCE',
    'VALUATION_EXCEPTIONS',
  ])('catalog includes %s', (code) => {
    expect(getReportDefinition(code)).toBeTruthy();
  });
});

describe('Phase 24 copilot tool names', () => {
  test.each([
    'getPortfolioSummary',
    'getPortfolioPerformance',
    'getHoldingDetails',
    'getInstrumentDetails',
    'getPendingSettlements',
    'getFailedSettlements',
    'getExpectedIncome',
    'getOverdueIncome',
    'getUpcomingMaturities',
    'getDistributionSummary',
    'getInvestorCapitalAccount',
    'getRiskBreaches',
    'getReconciliationExceptions',
    'getMonthEndExceptions',
    'comparePortfolioToBenchmark',
    'explainRealizedGainLoss',
    'explainNAVMovement',
  ])('tool %s registered', (name) => {
    expect(COPILOT_TOOLS).toContain(name);
  });
});

describe('Phase 24 work queue types', () => {
  test.each([
    'PENDING_APPROVAL',
    'PENDING_SETTLEMENT',
    'FAILED_SETTLEMENT',
    'UNMATCHED_RECON',
    'MISSING_VALUATION',
    'STALE_PRICE',
    'INCOME_OVERDUE',
    'CORP_ACTION_PENDING',
    'DISTRIBUTION_PENDING',
    'KYC_EXPIRING',
    'RISK_BREACH',
    'MONTH_END_EXCEPTION',
  ])('queue type %s', (t) => {
    expect(WORK_QUEUE_TYPES).toContain(t);
  });
});
