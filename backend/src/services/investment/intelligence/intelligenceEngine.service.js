'use strict';

/**
 * Pure report / intelligence / copilot helpers (Phase 24).
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function parseJson(raw, fallback = null) {
  if (raw == null || raw === '') return fallback;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

const REPORT_CATALOG = [
  // Portfolio
  { code: 'PORTFOLIO_SUMMARY', category: 'PORTFOLIO', name: 'Portfolio Summary' },
  { code: 'HOLDINGS_BY_ASSET_CLASS', category: 'PORTFOLIO', name: 'Holdings by Asset Class' },
  { code: 'HOLDINGS_BY_CURRENCY', category: 'PORTFOLIO', name: 'Holdings by Currency' },
  { code: 'HOLDINGS_BY_COUNTRY', category: 'PORTFOLIO', name: 'Holdings by Country' },
  { code: 'HOLDINGS_BY_SECTOR', category: 'PORTFOLIO', name: 'Holdings by Sector' },
  { code: 'HOLDINGS_BY_BROKER', category: 'PORTFOLIO', name: 'Holdings by Broker' },
  { code: 'HOLDINGS_BY_CUSTODIAN', category: 'PORTFOLIO', name: 'Holdings by Custodian' },
  { code: 'HOLDINGS_BY_OWNER', category: 'PORTFOLIO', name: 'Holdings by Owner' },
  { code: 'CONCENTRATION', category: 'PORTFOLIO', name: 'Concentration' },
  { code: 'LIQUIDITY', category: 'PORTFOLIO', name: 'Liquidity' },
  { code: 'MATURITY_LADDER', category: 'PORTFOLIO', name: 'Maturity Ladder' },
  // Performance
  { code: 'TOTAL_RETURN', category: 'PERFORMANCE', name: 'Total Return' },
  { code: 'TWR', category: 'PERFORMANCE', name: 'TWR' },
  { code: 'MWR', category: 'PERFORMANCE', name: 'MWR' },
  { code: 'IRR', category: 'PERFORMANCE', name: 'IRR' },
  { code: 'BENCHMARK_COMPARISON', category: 'PERFORMANCE', name: 'Benchmark Comparison' },
  { code: 'RETURN_ATTRIBUTION', category: 'PERFORMANCE', name: 'Return Attribution' },
  { code: 'INCOME_RETURN', category: 'PERFORMANCE', name: 'Income Return' },
  { code: 'CAPITAL_RETURN', category: 'PERFORMANCE', name: 'Capital Return' },
  { code: 'PERIOD_PERFORMANCE', category: 'PERFORMANCE', name: 'Monthly/Quarterly/Annual Performance' },
  // Operations
  { code: 'ORDER_BLOTTER', category: 'OPERATIONS', name: 'Order Blotter' },
  { code: 'TRADE_BLOTTER', category: 'OPERATIONS', name: 'Trade Blotter' },
  { code: 'SETTLEMENT_STATUS', category: 'OPERATIONS', name: 'Settlement Status' },
  { code: 'FAILED_SETTLEMENTS', category: 'OPERATIONS', name: 'Failed Settlements' },
  { code: 'CORP_ACTION_CALENDAR', category: 'OPERATIONS', name: 'Corporate Action Calendar' },
  { code: 'INCOME_CALENDAR', category: 'OPERATIONS', name: 'Income Calendar' },
  { code: 'MATURITY_CALENDAR', category: 'OPERATIONS', name: 'Maturity Calendar' },
  { code: 'POSTING_QUEUE', category: 'OPERATIONS', name: 'Posting Queue' },
  // Accounting
  { code: 'SUBLEDGER', category: 'ACCOUNTING', name: 'Investment Subledger' },
  { code: 'TRIAL_BALANCE', category: 'ACCOUNTING', name: 'Investment Trial Balance' },
  { code: 'REALIZED_GL', category: 'ACCOUNTING', name: 'Realized Gain/Loss' },
  { code: 'UNREALIZED_GL', category: 'ACCOUNTING', name: 'Unrealized Gain/Loss' },
  { code: 'ACCRUED_INCOME', category: 'ACCOUNTING', name: 'Accrued Income' },
  { code: 'FX_GL', category: 'ACCOUNTING', name: 'FX Gain/Loss' },
  { code: 'SUBLEDGER_GL_RECON', category: 'ACCOUNTING', name: 'Subledger-to-GL Reconciliation' },
  { code: 'POSTING_EXCEPTIONS', category: 'ACCOUNTING', name: 'Posting Exceptions' },
  { code: 'REVERSAL_REPORT', category: 'ACCOUNTING', name: 'Reversal Report' },
  // Partner
  { code: 'CAPITAL_ACCOUNT_STATEMENT', category: 'PARTNER', name: 'Capital Account Statement' },
  { code: 'COMMITMENT_STATEMENT', category: 'PARTNER', name: 'Commitment Statement' },
  { code: 'CONTRIBUTION_STATEMENT', category: 'PARTNER', name: 'Contribution Statement' },
  { code: 'OWNERSHIP_STATEMENT', category: 'PARTNER', name: 'Ownership Statement' },
  { code: 'DISTRIBUTION_STATEMENT', category: 'PARTNER', name: 'Distribution Statement' },
  { code: 'UNPAID_DISTRIBUTION', category: 'PARTNER', name: 'Unpaid Distribution' },
  { code: 'INVESTOR_NAV', category: 'PARTNER', name: 'Investor NAV' },
  { code: 'INVESTOR_IRR', category: 'PARTNER', name: 'Investor IRR' },
  // Risk
  { code: 'MANDATE_COMPLIANCE', category: 'RISK', name: 'Mandate Compliance' },
  { code: 'BREACH_REGISTER', category: 'RISK', name: 'Breach Register' },
  { code: 'EXPOSURE_LIMITS', category: 'RISK', name: 'Exposure Limits' },
  { code: 'LIQUIDITY_RISK', category: 'RISK', name: 'Liquidity Risk' },
  { code: 'COUNTERPARTY_RISK', category: 'RISK', name: 'Counterparty Risk' },
  { code: 'CURRENCY_RISK', category: 'RISK', name: 'Currency Risk' },
  { code: 'VALUATION_EXCEPTIONS', category: 'RISK', name: 'Valuation Exceptions' },
];

function getReportDefinition(code) {
  return REPORT_CATALOG.find((r) => r.code === String(code).toUpperCase()) || null;
}

function listReportsByCategory(category) {
  if (!category) return [...REPORT_CATALOG];
  return REPORT_CATALOG.filter((r) => r.category === String(category).toUpperCase());
}

function groupByDimension(rows, keyFn, valueFn = (r) => Number(r.marketValue || r.value || 0)) {
  const map = {};
  let total = 0;
  for (const row of rows || []) {
    const key = String(keyFn(row) || 'UNKNOWN').toUpperCase();
    const v = Number(valueFn(row) || 0);
    map[key] = (map[key] || 0) + v;
    total += v;
  }
  return Object.entries(map)
    .map(([key, value]) => ({
      key,
      value: round2(value),
      pct: total > 0 ? round2((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildMaturityLadder(holdings, asOf = new Date().toISOString().slice(0, 10)) {
  const buckets = { '0_30': 0, '31_90': 0, '91_365': 0, '1Y_3Y': 0, '3Y_PLUS': 0, OPEN_ENDED: 0, MATURED: 0 };
  for (const h of holdings || []) {
    const mv = Number(h.marketValue || h.currentMarketValue || 0);
    const md = h.maturityDate;
    if (!md) {
      buckets.OPEN_ENDED += mv;
      continue;
    }
    const [ay, am, ad] = asOf.split('-').map(Number);
    const [ey, em, ed] = String(md).slice(0, 10).split('-').map(Number);
    const days = Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(ay, am - 1, ad)) / 86400000);
    if (days < 0) buckets.MATURED += mv;
    else if (days <= 30) buckets['0_30'] += mv;
    else if (days <= 90) buckets['31_90'] += mv;
    else if (days <= 365) buckets['91_365'] += mv;
    else if (days <= 365 * 3) buckets['1Y_3Y'] += mv;
    else buckets['3Y_PLUS'] += mv;
  }
  const total = Object.values(buckets).reduce((s, v) => s + v, 0);
  return Object.entries(buckets).map(([key, value]) => ({
    key,
    value: round2(value),
    pct: total > 0 ? round2((value / total) * 100) : 0,
  }));
}

function shapeReport(code, payload = {}) {
  const def = getReportDefinition(code);
  if (!def) {
    const err = new Error(`Unknown report code: ${code}`);
    err.statusCode = 400;
    err.code = 'UNKNOWN_REPORT';
    throw err;
  }
  const rows = payload.rows || payload.data || [];
  return {
    reportCode: def.code,
    category: def.category,
    name: def.name,
    generatedAt: payload.generatedAt || new Date().toISOString(),
    filters: payload.filters || {},
    columns: payload.columns || inferColumns(rows),
    rows,
    summary: payload.summary || { rowCount: rows.length },
    charts: payload.charts || [],
  };
}

function inferColumns(rows) {
  if (!rows || !rows.length) return [];
  return Object.keys(rows[0]).map((k) => ({ key: k, label: k }));
}

function exportPayload(report, format = 'JSON') {
  const fmt = String(format || 'JSON').toUpperCase();
  if (fmt === 'CSV') {
    const cols = (report.columns || []).map((c) => c.key);
    const header = cols.length ? cols.join(',') : Object.keys((report.rows || [])[0] || { value: 1 }).join(',');
    const keys = cols.length ? cols : Object.keys((report.rows || [])[0] || { value: 1 });
    const lines = (report.rows || []).map((r) =>
      keys.map((c) => JSON.stringify(r[c] == null ? '' : r[c])).join(',')
    );
    return { format: 'CSV', content: [header, ...lines].join('\n'), mime: 'text/csv', stub: false };
  }
  // PDF/EXCEL are materialized async via investmentReportExport.service
  if (fmt === 'EXCEL' || fmt === 'XLSX' || fmt === 'PDF') {
    return {
      format: fmt === 'XLSX' ? 'EXCEL' : fmt,
      mime:
        fmt === 'PDF'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      deferred: true,
      stub: false,
    };
  }
  return { format: 'JSON', content: report, mime: 'application/json', stub: false };
}

function computeExecutiveCards(input = {}) {
  return {
    investedCapital: round2(input.investedCapital || 0),
    nav: round2(input.nav || 0),
    marketValue: round2(input.marketValue || 0),
    totalReturn: round2(input.totalReturn || 0),
    income: round2(input.income || 0),
    realizedGainLoss: round2(input.realizedGainLoss || 0),
    unrealizedGainLoss: round2(input.unrealizedGainLoss || 0),
    cash: round2(input.cash || 0),
    pendingSettlement: round2(input.pendingSettlement || 0),
    unfundedCommitment: round2(input.unfundedCommitment || 0),
    distributionPayable: round2(input.distributionPayable || 0),
    openExceptions: Number(input.openExceptions || 0),
    riskBreaches: Number(input.riskBreaches || 0),
    maturingSoon: Number(input.maturingSoon || 0),
  };
}

function filterCardsForRole(cards, role = 'INVESTMENT') {
  const partnerHide = new Set(['unfundedCommitment', 'distributionPayable']);
  const r = String(role || 'INVESTMENT').toUpperCase();
  if (r === 'PARTNER') {
    const out = { ...cards };
    for (const k of partnerHide) delete out[k];
    return out;
  }
  return { ...cards };
}

const WORK_QUEUE_TYPES = [
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
];

function buildWorkQueueItem(type, item) {
  if (!WORK_QUEUE_TYPES.includes(String(type).toUpperCase())) {
    const err = new Error(`Unknown work queue type: ${type}`);
    err.statusCode = 400;
    throw err;
  }
  return {
    type: String(type).toUpperCase(),
    id: item.id,
    title: item.title || `${type} #${item.id}`,
    href: item.href || null,
    severity: item.severity || 'MEDIUM',
    dueDate: item.dueDate || null,
    meta: item.meta || {},
  };
}

function summarizeWorkQueue(items = []) {
  const byType = {};
  for (const it of items) {
    byType[it.type] = (byType[it.type] || 0) + 1;
  }
  return {
    total: items.length,
    byType,
    items,
  };
}

function nextScheduleRun(cadence, from = new Date()) {
  const d = new Date(from);
  const c = String(cadence || 'MONTHLY').toUpperCase();
  if (c === 'DAILY') d.setDate(d.getDate() + 1);
  else if (c === 'WEEKLY') d.setDate(d.getDate() + 7);
  else if (c === 'QUARTERLY') d.setMonth(d.getMonth() + 3);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function canRunSchedule(schedule, now = new Date()) {
  if (String(schedule.status || '').toUpperCase() !== 'ACTIVE') return false;
  if (!schedule.nextRunAt && !schedule.next_run_at) return true;
  const next = new Date(schedule.nextRunAt || schedule.next_run_at);
  return next.getTime() <= now.getTime();
}

const COPILOT_TOOLS = [
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
];

function assertCopilotTool(name) {
  if (!COPILOT_TOOLS.includes(name)) {
    const err = new Error(`Unknown copilot tool: ${name}`);
    err.statusCode = 400;
    err.code = 'UNKNOWN_TOOL';
    throw err;
  }
}

function assertCopilotPermission(ctx = {}, toolName) {
  assertCopilotTool(toolName);
  const perms = ctx.permissions || [];
  if (!perms.includes('module:investment:view') && !ctx.bypassPermission) {
    const err = new Error('Missing module:investment:view');
    err.statusCode = 403;
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
  const partnerTools = new Set(['getInvestorCapitalAccount', 'getDistributionSummary']);
  if (partnerTools.has(toolName) && ctx.restrictPartnerData && !perms.includes('module:investment:reports')) {
    const err = new Error('Partner-sensitive tool requires reports permission');
    err.statusCode = 403;
    err.code = 'PARTNER_PRIVACY';
    throw err;
  }
  return true;
}

function groundCopilotResponse(toolName, data, meta = {}) {
  return {
    tool: toolName,
    grounded: true,
    companyId: meta.companyId || null,
    portfolioId: meta.portfolioId || null,
    generatedAt: new Date().toISOString(),
    data,
    citations: meta.citations || [{ source: 'erp', entity: toolName }],
  };
}

function explainNavMovement({ openingNav, closingNav, contributions = 0, distributions = 0, income = 0, fees = 0, unrealized = 0, realized = 0 }) {
  const open = Number(openingNav || 0);
  const close = Number(closingNav || 0);
  const bridge = round2(contributions - distributions + income - fees + unrealized + realized);
  const implied = round2(open + bridge);
  return {
    openingNav: round2(open),
    closingNav: round2(close),
    contributions: round2(contributions),
    distributions: round2(distributions),
    income: round2(income),
    fees: round2(fees),
    unrealized: round2(unrealized),
    realized: round2(realized),
    bridge,
    reconcilingDifference: round2(close - implied),
    explanation: `NAV moved from ${round2(open)} to ${round2(close)} via contributions ${round2(contributions)}, distributions ${round2(distributions)}, income ${round2(income)}, fees ${round2(fees)}, unrealized ${round2(unrealized)}, realized ${round2(realized)}.`,
  };
}

function explainRealizedGainLoss({ proceeds = 0, costBasis = 0, fees = 0, fx = 0 }) {
  const pnl = round2(Number(proceeds) - Number(costBasis) - Number(fees) + Number(fx));
  return {
    proceeds: round2(proceeds),
    costBasis: round2(costBasis),
    fees: round2(fees),
    fx: round2(fx),
    realizedGainLoss: pnl,
    explanation: `Realized P/L = proceeds ${round2(proceeds)} − cost ${round2(costBasis)} − fees ${round2(fees)} + FX ${round2(fx)} = ${pnl}.`,
  };
}

function compareToBenchmark({ portfolioReturn = 0, benchmarkReturn = 0 }) {
  const excess = round2(Number(portfolioReturn) - Number(benchmarkReturn));
  return {
    portfolioReturn: round2(portfolioReturn),
    benchmarkReturn: round2(benchmarkReturn),
    excessReturn: excess,
    outperformed: excess >= 0,
  };
}

module.exports = {
  round2,
  parseJson,
  REPORT_CATALOG,
  getReportDefinition,
  listReportsByCategory,
  groupByDimension,
  buildMaturityLadder,
  shapeReport,
  inferColumns,
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
};
