'use strict';

const { Op } = require('sequelize');
const {
  InvestmentSavedReport,
  InvestmentReportPack,
  InvestmentReportSchedule,
  InvestmentExportHistory,
  InvestmentCopilotToolLog,
  InvestmentHoldingV2,
  InvestmentInstrument,
  InvestmentOrder,
  InvestmentTrade,
  InvestmentSettlement,
  InvestmentIncomeEvent,
  InvestmentCorporateAction,
  InvestmentPerformancePeriod,
  InvestmentNavSnapshot,
  InvestmentRiskBreach,
  InvestmentReconciliationBatch,
  InvestmentClosePeriod,
  InvestmentInvestor,
  InvestmentCapitalAccount,
  InvestmentCommitment,
  InvestmentDistributionRun,
  InvestmentMarketPrice,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const {
  parseJson,
  REPORT_CATALOG,
  getReportDefinition,
  listReportsByCategory,
  groupByDimension,
  buildMaturityLadder,
  shapeReport,
  computeExecutiveCards,
  filterCardsForRole,
  WORK_QUEUE_TYPES,
  buildWorkQueueItem,
  summarizeWorkQueue,
  nextScheduleRun,
  canRunSchedule,
  COPILOT_TOOLS,
  assertCopilotPermission,
  groundCopilotResponse,
  explainNavMovement,
  explainRealizedGainLoss,
  compareToBenchmark,
  round2,
} = require('./intelligenceEngine.service');
const { materializeExport } = require('./investmentReportExport.service');

function userId(req) {
  return req.user?.id || req.userId || null;
}

function jsonOrNull(v) {
  if (v == null) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function baseWhere(req, filters = {}) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (filters.portfolioId) where.portfolioId = Number(filters.portfolioId);
  return where;
}

function dateRangeWhere(filters = {}, field = 'createdAt') {
  const clause = {};
  if (filters.fromDate) clause[Op.gte] = filters.fromDate;
  if (filters.toDate) clause[Op.lte] = filters.toDate;
  return Object.keys(clause).length ? { [field]: clause } : {};
}

async function nextCode(Model, companyId, prefix, field = 'id') {
  const count = await Model.count({ where: { companyId } });
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

function holdingRow(h) {
  const inst = h.instrument || {};
  const mv = Number(h.currentMarketValue || h.baseCurrencyValue || 0);
  return {
    holdingId: h.id,
    portfolioId: h.portfolioId,
    instrumentId: h.instrumentId,
    instrumentCode: inst.instrumentCode,
    instrumentName: inst.instrumentName,
    assetClass: inst.assetClass,
    currencyCode: inst.currencyCode,
    countryCode: inst.countryCode,
    sectorCode: inst.sectorCode,
    quantity: Number(h.quantity || 0),
    totalCost: Number(h.totalCost || 0),
    marketValue: round2(mv),
    unrealizedGainLoss: round2(h.unrealizedGainLoss || 0),
    realizedGainLoss: round2(h.realizedGainLoss || 0),
    maturityDate: inst.maturityDate || null,
  };
}

async function fetchHoldings(req, filters = {}) {
  const instWhere = { ...testDataWhere(req) };
  return InvestmentHoldingV2.findAll({
    where: baseWhere(req, filters),
    include: [{ model: InvestmentInstrument, as: 'instrument', where: instWhere, required: true }],
    order: [['id', 'ASC']],
  });
}

async function recordExport(req, { reportCode, packId, format, rowCount, filters, status = 'SUCCESS', errorMessage = null, fileRef = null }) {
  return InvestmentExportHistory.create(
    withCompanyId(req, {
      reportCode,
      packId: packId || null,
      format: String(format || 'JSON').toUpperCase(),
      rowCount: Number(rowCount || 0),
      status,
      fileRef,
      filtersJson: jsonOrNull(filters),
      generatedBy: userId(req),
      errorMessage,
      isTestData: !!req.body?.isTestData,
    })
  );
}

async function buildReportPayload(req, reportCode, filters = {}) {
  const code = String(reportCode).toUpperCase();
  const def = getReportDefinition(code);
  if (!def) {
    const err = new Error(`Unknown report code: ${code}`);
    err.statusCode = 400;
    throw err;
  }
  const asOf = filters.asOf || new Date().toISOString().slice(0, 10);
  const generatedAt = new Date().toISOString();

  // ——— Portfolio ———
  if (def.category === 'PORTFOLIO') {
    const holdings = await fetchHoldings(req, filters);
    const rows = holdings.map(holdingRow);
    const mvTotal = rows.reduce((s, r) => s + Number(r.marketValue || 0), 0);

    if (code === 'PORTFOLIO_SUMMARY') {
      return {
        generatedAt,
        filters,
        rows,
        summary: {
          rowCount: rows.length,
          marketValue: round2(mvTotal),
          totalCost: round2(rows.reduce((s, r) => s + r.totalCost, 0)),
          unrealizedGainLoss: round2(rows.reduce((s, r) => s + r.unrealizedGainLoss, 0)),
          realizedGainLoss: round2(rows.reduce((s, r) => s + r.realizedGainLoss, 0)),
        },
      };
    }
    if (code === 'HOLDINGS_BY_ASSET_CLASS') {
      const charts = [{ type: 'PIE', data: groupByDimension(rows, (r) => r.assetClass) }];
      return { generatedAt, filters, rows: groupByDimension(rows, (r) => r.assetClass), charts };
    }
    if (code === 'HOLDINGS_BY_CURRENCY') {
      const charts = [{ type: 'PIE', data: groupByDimension(rows, (r) => r.currencyCode) }];
      return { generatedAt, filters, rows: groupByDimension(rows, (r) => r.currencyCode), charts };
    }
    if (code === 'HOLDINGS_BY_COUNTRY') {
      return { generatedAt, filters, rows: groupByDimension(rows, (r) => r.countryCode) };
    }
    if (code === 'HOLDINGS_BY_SECTOR') {
      return { generatedAt, filters, rows: groupByDimension(rows, (r) => r.sectorCode) };
    }
    if (code === 'HOLDINGS_BY_BROKER' || code === 'HOLDINGS_BY_CUSTODIAN') {
      const trades = await InvestmentTrade.findAll({
        where: baseWhere(req, filters),
        attributes: ['instrumentId', 'brokerId', 'custodianId'],
        order: [['tradeDate', 'DESC']],
      });
      const dimField = code === 'HOLDINGS_BY_BROKER' ? 'brokerId' : 'custodianId';
      const instMap = {};
      for (const t of trades) {
        if (!instMap[t.instrumentId]) instMap[t.instrumentId] = t[dimField];
      }
      const enriched = rows.map((r) => ({ ...r, dimension: instMap[r.instrumentId] || 'UNKNOWN' }));
      return { generatedAt, filters, rows: groupByDimension(enriched, (r) => r.dimension) };
    }
    if (code === 'HOLDINGS_BY_OWNER') {
      return { generatedAt, filters, rows: groupByDimension(rows, (r) => `PORTFOLIO_${r.portfolioId}`) };
    }
    if (code === 'CONCENTRATION') {
      const sorted = [...rows].sort((a, b) => b.marketValue - a.marketValue);
      const conc = sorted.map((r) => ({
        ...r,
        pct: mvTotal > 0 ? round2((r.marketValue / mvTotal) * 100) : 0,
      }));
      return { generatedAt, filters, rows: conc, summary: { topHoldingPct: conc[0]?.pct || 0 } };
    }
    if (code === 'LIQUIDITY') {
      const liquid = new Set(['CASH', 'EQUITY', 'ETF', 'MONEY_MARKET', 'REIT']);
      const tagged = rows.map((r) => ({
        bucket: liquid.has(String(r.assetClass || '').toUpperCase()) ? 'LIQUID' : 'ILLIQUID',
        marketValue: r.marketValue,
      }));
      return { generatedAt, filters, rows: groupByDimension(tagged, (r) => r.bucket) };
    }
    if (code === 'MATURITY_LADDER') {
      const ladder = buildMaturityLadder(holdings, asOf);
      return { generatedAt, filters, rows: ladder, charts: [{ type: 'BAR', data: ladder }] };
    }
  }

  // ——— Performance ———
  if (def.category === 'PERFORMANCE') {
    const where = baseWhere(req, filters);
    if (filters.periodStart) where.periodStart = { [Op.gte]: filters.periodStart };
    if (filters.periodEnd) where.periodEnd = { [Op.lte]: filters.periodEnd };
    const periods = await InvestmentPerformancePeriod.findAll({
      where,
      order: [['periodEnd', 'DESC']],
      limit: filters.limit ? Number(filters.limit) : 24,
    });
    const rows = periods.map((p) => ({
      id: p.id,
      portfolioId: p.portfolioId,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      openingValue: round2(p.openingValue),
      closingValue: round2(p.closingValue),
      income: round2(p.income),
      realizedGainLoss: round2(p.realizedGainLoss),
      unrealizedGainLoss: round2(p.unrealizedGainLoss),
      twr: p.twr != null ? round2(p.twr) : null,
      mwr: p.mwr != null ? round2(p.mwr) : null,
      irr: p.irr != null ? round2(p.irr) : null,
      absoluteReturn: p.absoluteReturn != null ? round2(p.absoluteReturn) : null,
      benchmarkReturn: p.benchmarkReturn != null ? round2(p.benchmarkReturn) : null,
      excessReturn: p.excessReturn != null ? round2(p.excessReturn) : null,
    }));
    const latest = rows[0] || {};
    let summary = { rowCount: rows.length };
    if (code === 'TOTAL_RETURN') summary.totalReturn = latest.absoluteReturn || 0;
    if (code === 'TWR') summary.twr = latest.twr;
    if (code === 'MWR') summary.mwr = latest.mwr;
    if (code === 'IRR') summary.irr = latest.irr;
    if (code === 'BENCHMARK_COMPARISON' && latest.benchmarkReturn != null) {
      summary = { ...summary, ...compareToBenchmark({ portfolioReturn: latest.absoluteReturn, benchmarkReturn: latest.benchmarkReturn }) };
    }
    if (code === 'INCOME_RETURN') summary.incomeReturn = latest.income;
    if (code === 'CAPITAL_RETURN') {
      summary.capitalReturn = round2((latest.closingValue || 0) - (latest.openingValue || 0) - (latest.income || 0));
    }
    if (code === 'RETURN_ATTRIBUTION') {
      summary = {
        income: latest.income,
        realized: latest.realizedGainLoss,
        unrealized: latest.unrealizedGainLoss,
      };
    }
    return {
      generatedAt,
      filters,
      rows,
      summary,
      charts: code === 'PERIOD_PERFORMANCE' ? [{ type: 'LINE', data: rows }] : [],
    };
  }

  // ——— Operations ———
  if (def.category === 'OPERATIONS') {
    const opWhere = baseWhere(req, filters);
    const dr = dateRangeWhere(filters, 'orderDate');

    if (code === 'ORDER_BLOTTER') {
      const orders = await InvestmentOrder.findAll({
        where: { ...opWhere, ...dr },
        include: [{ model: InvestmentInstrument, as: 'instrument', attributes: ['instrumentCode', 'instrumentName'] }],
        order: [['orderDate', 'DESC']],
        limit: 500,
      });
      const rows = orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        side: o.side,
        quantity: Number(o.quantity),
        status: o.status,
        instrument: o.instrument?.instrumentCode,
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'TRADE_BLOTTER') {
      const trades = await InvestmentTrade.findAll({
        where: { ...opWhere, ...dateRangeWhere(filters, 'tradeDate') },
        include: [{ model: InvestmentInstrument, as: 'instrument', attributes: ['instrumentCode', 'instrumentName'] }],
        order: [['tradeDate', 'DESC']],
        limit: 500,
      });
      const rows = trades.map((t) => ({
        id: t.id,
        tradeNumber: t.tradeNumber,
        tradeDate: t.tradeDate,
        side: t.side,
        quantity: Number(t.quantity),
        grossAmount: round2(t.grossAmount),
        status: t.status,
        instrument: t.instrument?.instrumentCode,
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'SETTLEMENT_STATUS' || code === 'FAILED_SETTLEMENTS') {
      const stWhere = { ...companyWhere(req), ...testDataWhere(req) };
      if (code === 'FAILED_SETTLEMENTS') stWhere.status = 'FAILED';
      const settlements = await InvestmentSettlement.findAll({
        where: stWhere,
        include: [{
          model: InvestmentTrade,
          as: 'trade',
          where: filters.portfolioId ? { portfolioId: Number(filters.portfolioId) } : {},
          required: !!filters.portfolioId,
        }],
        order: [['expectedDate', 'ASC']],
        limit: 500,
      });
      const rows = settlements.map((s) => ({
        id: s.id,
        settlementNumber: s.settlementNumber,
        expectedDate: s.expectedDate,
        actualDate: s.actualDate,
        settlementAmount: round2(s.settlementAmount),
        status: s.status,
        failureReason: s.failureReason,
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'CORP_ACTION_CALENDAR') {
      const actions = await InvestmentCorporateAction.findAll({
        where: { ...companyWhere(req), ...testDataWhere(req), ...dateRangeWhere(filters, 'effectiveDate') },
        include: [{ model: InvestmentInstrument, as: 'instrument', attributes: ['instrumentCode', 'instrumentName'] }],
        order: [['effectiveDate', 'ASC']],
        limit: 200,
      });
      const rows = actions.map((a) => ({
        id: a.id,
        actionNumber: a.actionNumber,
        actionType: a.actionType,
        effectiveDate: a.effectiveDate,
        electionDeadline: a.electionDeadline,
        status: a.status,
        instrument: a.instrument?.instrumentCode,
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'INCOME_CALENDAR') {
      const income = await InvestmentIncomeEvent.findAll({
        where: { ...opWhere, ...dateRangeWhere(filters, 'paymentDate') },
        order: [['paymentDate', 'ASC']],
        limit: 200,
      });
      const rows = income.map((e) => ({
        id: e.id,
        eventNumber: e.eventNumber,
        incomeType: e.incomeType,
        paymentDate: e.paymentDate,
        netAmount: round2(e.netAmount),
        status: e.status,
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'MATURITY_CALENDAR') {
      const holdings = await fetchHoldings(req, filters);
      const rows = holdings
        .filter((h) => h.instrument?.maturityDate)
        .map((h) => ({
          instrumentCode: h.instrument.instrumentCode,
          instrumentName: h.instrument.instrumentName,
          maturityDate: h.instrument.maturityDate,
          marketValue: round2(h.currentMarketValue),
        }))
        .sort((a, b) => String(a.maturityDate).localeCompare(String(b.maturityDate)));
      return { generatedAt, filters, rows };
    }
    if (code === 'POSTING_QUEUE') {
      const orders = await InvestmentOrder.findAll({
        where: { ...opWhere, status: { [Op.in]: ['APPROVED', 'EXECUTED'] } },
        order: [['orderDate', 'ASC']],
        limit: 200,
      });
      const rows = orders.map((o) => ({
        id: o.id,
        sourceType: 'ORDER',
        sourceNumber: o.orderNumber,
        orderDate: o.orderDate,
        status: o.status,
      }));
      return { generatedAt, filters, rows };
    }
  }

  // ——— Accounting ———
  if (def.category === 'ACCOUNTING') {
    const holdings = await fetchHoldings(req, filters);
    const rows = holdings.map(holdingRow);

    if (code === 'REALIZED_GL' || code === 'UNREALIZED_GL') {
      const field = code === 'REALIZED_GL' ? 'realizedGainLoss' : 'unrealizedGainLoss';
      const glRows = rows
        .filter((r) => Math.abs(r[field]) > 0)
        .map((r) => ({ ...r, gainLoss: r[field] }));
      return { generatedAt, filters, rows: glRows, summary: { total: round2(glRows.reduce((s, r) => s + r.gainLoss, 0)) } };
    }
    if (code === 'ACCRUED_INCOME') {
      const income = await InvestmentIncomeEvent.findAll({
        where: { ...baseWhere(req, filters), status: { [Op.in]: ['ACCRUED', 'RECEIVABLE'] } },
        limit: 500,
      });
      const incRows = income.map((e) => ({
        id: e.id,
        eventNumber: e.eventNumber,
        accruedAmount: round2(e.accruedAmount),
        grossAmount: round2(e.grossAmount),
        status: e.status,
      }));
      return { generatedAt, filters, rows: incRows };
    }
    if (code === 'SUBLEDGER' || code === 'TRIAL_BALANCE') {
      const tb = rows.map((r) => ({
        instrumentCode: r.instrumentCode,
        totalCost: r.totalCost,
        marketValue: r.marketValue,
        unrealizedGainLoss: r.unrealizedGainLoss,
        realizedGainLoss: r.realizedGainLoss,
      }));
      return {
        generatedAt,
        filters,
        rows: tb,
        summary: {
          totalCost: round2(tb.reduce((s, r) => s + r.totalCost, 0)),
          marketValue: round2(tb.reduce((s, r) => s + r.marketValue, 0)),
        },
      };
    }
    if (code === 'FX_GL') {
      const fxRows = rows.map((r) => ({
        instrumentCode: r.instrumentCode,
        currencyCode: r.currencyCode,
        baseValue: round2(holdings.find((h) => h.id === r.holdingId)?.baseCurrencyValue || r.marketValue),
        marketValue: r.marketValue,
      }));
      return { generatedAt, filters, rows: fxRows };
    }
    if (code === 'SUBLEDGER_GL_RECON') {
      const batches = await InvestmentReconciliationBatch.findAll({
        where: { ...baseWhere(req, filters), reconciliationType: 'SUBLEDGER_GL' },
        order: [['statementDate', 'DESC']],
        limit: 50,
      });
      const reconRows = batches.map((b) => ({
        id: b.id,
        batchNumber: b.batchNumber,
        statementDate: b.statementDate,
        status: b.status,
        exceptionRecords: b.exceptionRecords,
        unmatchedRecords: b.unmatchedRecords,
      }));
      return { generatedAt, filters, rows: reconRows };
    }
    if (code === 'POSTING_EXCEPTIONS' || code === 'REVERSAL_REPORT') {
      const trades = await InvestmentTrade.findAll({
        where: { ...baseWhere(req, filters), status: code === 'REVERSAL_REPORT' ? 'CANCELLED' : { [Op.ne]: 'SETTLED' } },
        limit: 200,
      });
      const tRows = trades.map((t) => ({
        id: t.id,
        tradeNumber: t.tradeNumber,
        tradeDate: t.tradeDate,
        status: t.status,
        netSettlement: round2(t.netSettlement),
      }));
      return { generatedAt, filters, rows: tRows };
    }
  }

  // ——— Partner ———
  if (def.category === 'PARTNER') {
    const pWhere = baseWhere(req, filters);
    if (filters.investorId) pWhere.investorId = Number(filters.investorId);

    if (code === 'CAPITAL_ACCOUNT_STATEMENT') {
      const accounts = await InvestmentCapitalAccount.findAll({
        where: pWhere,
        include: [{ model: InvestmentInvestor, as: 'investor', attributes: ['investorCode', 'legalName'] }],
        order: [['period', 'DESC']],
        limit: 100,
      });
      const rows = accounts.map((a) => ({
        id: a.id,
        period: a.period,
        investor: a.investor?.legalName,
        openingBalance: round2(a.openingBalance),
        contributions: round2(a.contributions),
        distributions: round2(a.distributions),
        closingBalance: round2(a.closingBalance),
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'COMMITMENT_STATEMENT' || code === 'CONTRIBUTION_STATEMENT') {
      const commitments = await InvestmentCommitment.findAll({
        where: pWhere,
        include: [{ model: InvestmentInvestor, as: 'investor', attributes: ['investorCode', 'legalName'] }],
        order: [['commitmentDate', 'DESC']],
        limit: 100,
      });
      const rows = commitments.map((c) => ({
        id: c.id,
        commitmentNumber: c.commitmentNumber,
        investor: c.investor?.legalName,
        commitmentAmount: round2(c.commitmentAmount),
        fundedAmount: round2(c.fundedAmount),
        unfundedAmount: round2(c.unfundedAmount),
        status: c.status,
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'DISTRIBUTION_STATEMENT' || code === 'UNPAID_DISTRIBUTION') {
      const distWhere = { ...baseWhere(req, filters) };
      if (code === 'UNPAID_DISTRIBUTION') distWhere.paymentStatus = 'UNPAID';
      const runs = await InvestmentDistributionRun.findAll({
        where: distWhere,
        order: [['periodEnd', 'DESC']],
        limit: 100,
      });
      const rows = runs.map((d) => ({
        id: d.id,
        distributionNumber: d.distributionNumber,
        periodEnd: d.periodEnd,
        netDistributableAmount: round2(d.netDistributableAmount),
        paymentStatus: d.paymentStatus,
        status: d.status,
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'INVESTOR_NAV') {
      const navWhere = { ...baseWhere(req, filters) };
      if (filters.investorId) navWhere.investorId = Number(filters.investorId);
      const snaps = await InvestmentNavSnapshot.findAll({
        where: navWhere,
        order: [['navDate', 'DESC']],
        limit: 50,
      });
      const rows = snaps.map((n) => ({
        id: n.id,
        navDate: n.navDate,
        nav: round2(n.nav),
        navPerUnit: n.navPerUnit != null ? round2(n.navPerUnit) : null,
        marketValue: round2(n.marketValue),
      }));
      return { generatedAt, filters, rows };
    }
    if (code === 'INVESTOR_IRR' || code === 'OWNERSHIP_STATEMENT') {
      const investors = await InvestmentInvestor.findAll({
        where: { ...companyWhere(req), ...testDataWhere(req), ...(filters.investorId ? { id: Number(filters.investorId) } : {}) },
        limit: 100,
      });
      const rows = investors.map((i) => ({
        id: i.id,
        investorCode: i.investorCode,
        legalName: i.legalName,
        status: i.status,
        kycStatus: i.kycStatus,
      }));
      return { generatedAt, filters, rows };
    }
  }

  // ——— Risk ———
  if (def.category === 'RISK') {
    const rWhere = { ...baseWhere(req, filters) };
    if (code === 'BREACH_REGISTER' || code === 'MANDATE_COMPLIANCE') {
      rWhere.status = { [Op.in]: ['OPEN', 'UNDER_REVIEW'] };
    }
    const breaches = await InvestmentRiskBreach.findAll({
      where: rWhere,
      order: [['detectedAt', 'DESC']],
      limit: 200,
    });
    const rows = breaches.map((b) => ({
      id: b.id,
      breachNumber: b.breachNumber,
      severity: b.severity,
      status: b.status,
      actualValue: round2(b.actualValue),
      limitValue: round2(b.limitValue),
      dimensionKey: b.dimensionKey,
      detectedAt: b.detectedAt,
    }));
    return { generatedAt, filters, rows, summary: { openBreaches: rows.length } };
  }

  return { generatedAt, filters, rows: [] };
}

// ——— Catalog & reports ———

async function listReportCatalog(req) {
  const categories = [...new Set(REPORT_CATALOG.map((r) => r.category))];
  const byCategory = {};
  for (const cat of categories) {
    byCategory[cat] = listReportsByCategory(cat);
  }
  if (req.query?.category) {
    return {
      catalog: listReportsByCategory(req.query.category),
      categories,
      byCategory,
      filteredCategory: String(req.query.category).toUpperCase(),
    };
  }
  return { catalog: REPORT_CATALOG, categories, byCategory };
}

async function runReport(req, data = {}) {
  const reportCode = String(data.reportCode || req.query?.reportCode || '').toUpperCase();
  if (!reportCode) {
    const err = new Error('reportCode is required');
    err.statusCode = 400;
    throw err;
  }
  const filters = {
    ...parseJson(data.filtersJson || data.filters, {}),
    portfolioId: data.portfolioId || req.query?.portfolioId,
    investorId: data.investorId || req.query?.investorId,
    fromDate: data.fromDate || req.query?.fromDate,
    toDate: data.toDate || req.query?.toDate,
    asOf: data.asOf || req.query?.asOf,
  };
  const payload = await buildReportPayload(req, reportCode, filters);
  const report = shapeReport(reportCode, payload);
  const format = data.format || req.query?.format;
  let exportResult = null;
  if (format) {
    try {
      exportResult = await materializeExport(report, format, {
        companyId: req.companyId,
        writeFile: data.writeFile !== false,
      });
      // Don't send huge base64 in pack runs unless requested
      if (data.omitBase64) {
        const { base64, content, ...meta } = exportResult;
        exportResult = { ...meta, hasContent: true };
      }
      await recordExport(req, {
        reportCode,
        packId: data.packId || null,
        format: exportResult.format,
        rowCount: (report.rows || []).length,
        filters,
        fileRef: exportResult.fileRef || null,
      });
    } catch (err) {
      await recordExport(req, {
        reportCode,
        packId: data.packId || null,
        format,
        rowCount: (report.rows || []).length,
        filters,
        status: 'FAILED',
        errorMessage: err.message,
      }).catch(() => {});
      throw err;
    }
  }
  return { report, export: exportResult };
}

// ——— Saved reports ———

async function listSavedReports(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.reportCode) where.reportCode = String(req.query.reportCode).toUpperCase();
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  const { count, rows } = await InvestmentSavedReport.findAndCountAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit,
    offset,
  });
  return { savedReports: rows, pagination: paginationMeta(count, page, limit) };
}

async function createSavedReport(req, data) {
  if (!data.reportCode || !data.name) {
    const err = new Error('reportCode and name are required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentSavedReport.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId || null,
      reportCode: String(data.reportCode).toUpperCase(),
      name: data.name,
      filtersJson: jsonOrNull(data.filters || data.filtersJson),
      format: data.format || 'JSON',
      createdBy: userId(req),
      isTestData: !!data.isTestData,
    })
  );
}

// ——— Packs ———

async function listPacks(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  const { count, rows } = await InvestmentReportPack.findAndCountAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit,
    offset,
  });
  return { packs: rows, pagination: paginationMeta(count, page, limit) };
}

async function createPack(req, data) {
  if (!data.name || !data.reportCodes?.length) {
    const err = new Error('name and reportCodes are required');
    err.statusCode = 400;
    throw err;
  }
  const codes = (data.reportCodes || []).map((c) => String(c).toUpperCase());
  for (const c of codes) {
    if (!getReportDefinition(c)) {
      const err = new Error(`Unknown report code in pack: ${c}`);
      err.statusCode = 400;
      throw err;
    }
  }
  return InvestmentReportPack.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId || null,
      packCode: data.packCode || (await nextCode(InvestmentReportPack, req.companyId, 'PACK')),
      name: data.name,
      reportCodesJson: JSON.stringify(codes),
      status: data.status || 'DRAFT',
      createdBy: userId(req),
      isTestData: !!data.isTestData,
    })
  );
}

async function runPack(req, data = {}) {
  const packId = data.packId || req.params?.id;
  const pack = await InvestmentReportPack.findOne({ where: { id: packId, ...companyWhere(req) } });
  if (!pack) {
    const err = new Error('Report pack not found');
    err.statusCode = 404;
    throw err;
  }
  const codes = parseJson(pack.reportCodesJson, []);
  const format = data.format || pack.format || 'JSON';
  const filters = {
    ...parseJson(data.filters || data.filtersJson, {}),
    portfolioId: data.portfolioId || pack.portfolioId,
  };
  const reports = [];
  let failed = 0;
  for (const code of codes) {
    try {
      const { report } = await runReport(req, { reportCode: code, filters, format, packId: pack.id, recordExport: false });
      reports.push(report);
    } catch (e) {
      failed += 1;
      reports.push({ reportCode: code, error: e.message, status: 'FAILED' });
    }
  }
  try {
    await recordExport(req, {
      reportCode: 'PACK',
      packId: pack.id,
      format,
      rowCount: reports.length,
      filters: { packCode: pack.packCode, codes },
      status: failed ? (failed === codes.length ? 'FAILED' : 'PARTIAL') : 'SUCCESS',
    });
  } catch {
    // ignore if table missing
  }
  return { pack, reports, summary: { total: codes.length, succeeded: codes.length - failed, failed } };
}

// ——— Schedules ———

async function listSchedules(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  const { count, rows } = await InvestmentReportSchedule.findAndCountAll({
    where,
    order: [['nextRunAt', 'ASC']],
    limit,
    offset,
  });
  return { schedules: rows, pagination: paginationMeta(count, page, limit) };
}

async function createSchedule(req, data) {
  if (!data.cadence) {
    const err = new Error('cadence is required');
    err.statusCode = 400;
    throw err;
  }
  if (!data.packId && !data.savedReportId) {
    const err = new Error('packId or savedReportId is required');
    err.statusCode = 400;
    throw err;
  }
  const nextRun = data.nextRunAt ? new Date(data.nextRunAt) : nextScheduleRun(data.cadence);
  return InvestmentReportSchedule.create(
    withCompanyId(req, {
      packId: data.packId || null,
      savedReportId: data.savedReportId || null,
      scheduleCode: data.scheduleCode || (await nextCode(InvestmentReportSchedule, req.companyId, 'SCH')),
      cadence: String(data.cadence).toUpperCase(),
      nextRunAt: nextRun,
      emailTo: data.emailTo || null,
      format: data.format || 'PDF',
      status: data.status || 'ACTIVE',
      isTestData: !!data.isTestData,
    })
  );
}

async function runDueSchedules(req) {
  const now = new Date();
  const schedules = await InvestmentReportSchedule.findAll({
    where: { ...companyWhere(req), ...testDataWhere(req), status: 'ACTIVE' },
  });
  const due = schedules.filter((s) => canRunSchedule(s, now));
  const results = [];
  for (const schedule of due) {
    let runResult = null;
    let status = 'OK';
    try {
      if (schedule.packId) {
        runResult = await runPack(req, { packId: schedule.packId, format: schedule.format });
      } else if (schedule.savedReportId) {
        const saved = await InvestmentSavedReport.findOne({
          where: { id: schedule.savedReportId, ...companyWhere(req) },
        });
        if (saved) {
          runResult = await runReport(req, {
            reportCode: saved.reportCode,
            filters: parseJson(saved.filtersJson, {}),
            portfolioId: saved.portfolioId,
            format: schedule.format || saved.format,
          });
        }
      }
      schedule.lastRunAt = now;
      schedule.nextRunAt = nextScheduleRun(schedule.cadence, now);
      await schedule.save();
    } catch (e) {
      status = 'ERROR';
      runResult = { error: e.message };
    }
    results.push({ scheduleId: schedule.id, scheduleCode: schedule.scheduleCode, status, runResult });
  }
  return { ran: results.length, results };
}

async function listExportHistory(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.reportCode) where.reportCode = String(req.query.reportCode).toUpperCase();
  const { count, rows } = await InvestmentExportHistory.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });
  return { exports: rows, pagination: paginationMeta(count, page, limit) };
}

// ——— Executive dashboard ———

async function getExecutiveDashboard(req) {
  const filters = { portfolioId: req.query?.portfolioId };
  const holdings = await fetchHoldings(req, filters);
  const rows = holdings.map(holdingRow);
  const marketValue = rows.reduce((s, r) => s + r.marketValue, 0);
  const investedCapital = rows.reduce((s, r) => s + r.totalCost, 0);
  const unrealizedGainLoss = rows.reduce((s, r) => s + r.unrealizedGainLoss, 0);
  const realizedGainLoss = rows.reduce((s, r) => s + r.realizedGainLoss, 0);

  const navWhere = { ...baseWhere(req, filters), investorId: null };
  const latestNav = await InvestmentNavSnapshot.findOne({
    where: navWhere,
    order: [['navDate', 'DESC']],
  });

  const pendingSettlement =
    (await InvestmentSettlement.sum('settlementAmount', {
      where: { ...companyWhere(req), ...testDataWhere(req), status: { [Op.in]: ['PENDING', 'PARTIALLY_SETTLED'] } },
    })) || 0;

  const unfundedCommitment =
    (await InvestmentCommitment.sum('unfundedAmount', {
      where: { ...baseWhere(req, filters), status: 'ACTIVE' },
    })) || 0;

  const distributionPayable =
    (await InvestmentDistributionRun.sum('netDistributableAmount', {
      where: { ...baseWhere(req, filters), paymentStatus: 'UNPAID' },
    })) || 0;

  const openExceptions = await InvestmentReconciliationBatch.count({
    where: { ...baseWhere(req, filters), status: { [Op.in]: ['EXCEPTION', 'MATCHING'] } },
  });

  const riskBreaches = await InvestmentRiskBreach.count({
    where: { ...baseWhere(req, filters), status: { [Op.in]: ['OPEN', 'UNDER_REVIEW'] } },
  });

  const asOf = new Date().toISOString().slice(0, 10);
  const thirtyDays = new Date();
  thirtyDays.setDate(thirtyDays.getDate() + 30);
  const maturingSoon = rows.filter((r) => r.maturityDate && r.maturityDate <= thirtyDays.toISOString().slice(0, 10)).length;

  const income =
    (await InvestmentIncomeEvent.sum('netAmount', {
      where: { ...baseWhere(req, filters), status: { [Op.in]: ['RECEIVED', 'RECONCILED'] } },
    })) || 0;

  const latestPerf = await InvestmentPerformancePeriod.findOne({
    where: baseWhere(req, filters),
    order: [['periodEnd', 'DESC']],
  });

  const cards = computeExecutiveCards({
    investedCapital,
    nav: latestNav?.nav || marketValue,
    marketValue,
    totalReturn: latestPerf?.absoluteReturn || 0,
    income,
    realizedGainLoss,
    unrealizedGainLoss,
    cash: latestNav?.cash || 0,
    pendingSettlement,
    unfundedCommitment,
    distributionPayable,
    openExceptions,
    riskBreaches,
    maturingSoon,
  });

  const roleCards = filterCardsForRole(cards, req.query?.role);

  const charts = {
    assetAllocation: groupByDimension(rows, (r) => r.assetClass),
    currencyExposure: groupByDimension(rows, (r) => r.currencyCode),
    sectorExposure: groupByDimension(rows, (r) => r.sectorCode),
    maturityLadder: buildMaturityLadder(holdings, asOf),
    performanceVsBenchmark: latestPerf
      ? compareToBenchmark({
          portfolioReturn: latestPerf.absoluteReturn,
          benchmarkReturn: latestPerf.benchmarkReturn,
        })
      : null,
    partnerOwnership: groupByDimension(rows, (r) => `PORTFOLIO_${r.portfolioId}`),
    liquidityLadder: groupByDimension(
      rows.map((r) => ({
        bucket: ['CASH', 'EQUITY', 'ETF'].includes(String(r.assetClass || '').toUpperCase()) ? 'LIQUID' : 'ILLIQUID',
        marketValue: r.marketValue,
      })),
      (r) => r.bucket
    ),
    incomeForecast: [],
    cashFlowForecast: [],
    riskHeatmap: await InvestmentRiskBreach.findAll({
      where: { ...baseWhere(req, filters), status: { [Op.in]: ['OPEN', 'UNDER_REVIEW'] } },
      attributes: ['id', 'severity', 'dimensionKey', 'actualValue', 'limitValue'],
      limit: 20,
    }),
  };

  return { cards: roleCards, charts, asOf, role: req.query?.role || 'INVESTMENT' };
}

// ——— Work queue ———

async function getWorkQueue(req) {
  const items = [];
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);
  const soonStr = soon.toISOString().slice(0, 10);

  const pendingOrders = await InvestmentOrder.findAll({
    where: { ...baseWhere(req), status: { [Op.in]: ['SUBMITTED', 'APPROVED'] } },
    limit: 50,
  });
  for (const o of pendingOrders) {
    items.push(buildWorkQueueItem('PENDING_APPROVAL', {
      id: o.id,
      title: `Order ${o.orderNumber} awaiting action`,
      href: `/investments/v2/orders/${o.id}`,
      severity: o.status === 'SUBMITTED' ? 'HIGH' : 'MEDIUM',
      dueDate: o.expiryDate,
      meta: { status: o.status },
    }));
  }

  const pendingSettlements = await InvestmentSettlement.findAll({
    where: { ...companyWhere(req), ...testDataWhere(req), status: { [Op.in]: ['PENDING', 'PARTIALLY_SETTLED'] } },
    limit: 50,
  });
  for (const s of pendingSettlements) {
    items.push(buildWorkQueueItem('PENDING_SETTLEMENT', {
      id: s.id,
      title: `Settlement ${s.settlementNumber}`,
      href: `/investments/v2/settlements/${s.id}`,
      dueDate: s.expectedDate,
      meta: { amount: round2(s.settlementAmount) },
    }));
  }

  const failedSettlements = await InvestmentSettlement.findAll({
    where: { ...companyWhere(req), ...testDataWhere(req), status: 'FAILED' },
    limit: 50,
  });
  for (const s of failedSettlements) {
    items.push(buildWorkQueueItem('FAILED_SETTLEMENT', {
      id: s.id,
      title: `Failed settlement ${s.settlementNumber}`,
      href: `/investments/v2/settlements/${s.id}`,
      severity: 'HIGH',
      meta: { reason: s.failureReason },
    }));
  }

  const reconBatches = await InvestmentReconciliationBatch.findAll({
    where: { ...baseWhere(req), unmatchedRecords: { [Op.gt]: 0 } },
    limit: 30,
  });
  for (const b of reconBatches) {
    items.push(buildWorkQueueItem('UNMATCHED_RECON', {
      id: b.id,
      title: `Recon ${b.batchNumber} — ${b.unmatchedRecords} unmatched`,
      href: `/investments/v2/reconciliation/${b.id}`,
      meta: { type: b.reconciliationType },
    }));
  }

  const holdings = await fetchHoldings(req, { portfolioId: req.query?.portfolioId });
  for (const h of holdings) {
    if (!h.lastValuationDate) {
      items.push(buildWorkQueueItem('MISSING_VALUATION', {
        id: h.id,
        title: `Missing valuation for holding #${h.id}`,
        href: `/investments/v2/holdings/${h.id}`,
        severity: 'MEDIUM',
      }));
    }
  }

  const stalePrices = await InvestmentMarketPrice.findAll({
    where: { ...companyWhere(req), ...testDataWhere(req), staleFlag: true },
    limit: 30,
  });
  for (const p of stalePrices) {
    items.push(buildWorkQueueItem('STALE_PRICE', {
      id: p.id,
      title: `Stale price for instrument #${p.instrumentId}`,
      severity: 'MEDIUM',
      meta: { priceDate: p.priceDate },
    }));
  }

  const overdueIncome = await InvestmentIncomeEvent.findAll({
    where: {
      ...baseWhere(req),
      status: { [Op.in]: ['EXPECTED', 'RECEIVABLE'] },
      paymentDate: { [Op.lt]: today },
    },
    limit: 30,
  });
  for (const e of overdueIncome) {
    items.push(buildWorkQueueItem('INCOME_OVERDUE', {
      id: e.id,
      title: `Overdue income ${e.eventNumber}`,
      dueDate: e.paymentDate,
      severity: 'HIGH',
      meta: { amount: round2(e.netAmount) },
    }));
  }

  const corpActions = await InvestmentCorporateAction.findAll({
    where: { ...companyWhere(req), ...testDataWhere(req), status: { [Op.in]: ['ANNOUNCED', 'ENTITLED'] } },
    limit: 30,
  });
  for (const a of corpActions) {
    items.push(buildWorkQueueItem('CORP_ACTION_PENDING', {
      id: a.id,
      title: `Corporate action ${a.actionNumber}`,
      dueDate: a.electionDeadline,
      meta: { actionType: a.actionType },
    }));
  }

  const distRuns = await InvestmentDistributionRun.findAll({
    where: { ...baseWhere(req), paymentStatus: 'UNPAID', status: { [Op.in]: ['APPROVED', 'PAYABLE_CREATED'] } },
    limit: 30,
  });
  for (const d of distRuns) {
    items.push(buildWorkQueueItem('DISTRIBUTION_PENDING', {
      id: d.id,
      title: `Distribution ${d.distributionNumber} unpaid`,
      severity: 'MEDIUM',
      meta: { amount: round2(d.netDistributableAmount) },
    }));
  }

  const kycInvestors = await InvestmentInvestor.findAll({
    where: {
      ...companyWhere(req),
      ...testDataWhere(req),
      kycExpiryDate: { [Op.lte]: soonStr, [Op.ne]: null },
    },
    limit: 30,
  });
  for (const i of kycInvestors) {
    items.push(buildWorkQueueItem('KYC_EXPIRING', {
      id: i.id,
      title: `KYC expiring: ${i.legalName}`,
      dueDate: i.kycExpiryDate,
      severity: 'HIGH',
    }));
  }

  const breaches = await InvestmentRiskBreach.findAll({
    where: { ...baseWhere(req), status: { [Op.in]: ['OPEN', 'UNDER_REVIEW'] } },
    limit: 30,
  });
  for (const b of breaches) {
    items.push(buildWorkQueueItem('RISK_BREACH', {
      id: b.id,
      title: `Risk breach ${b.breachNumber}`,
      severity: b.severity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      meta: { dimensionKey: b.dimensionKey },
    }));
  }

  const closePeriods = await InvestmentClosePeriod.findAll({
    where: { ...baseWhere(req), status: { [Op.in]: ['IN_PROGRESS', 'OPEN'] } },
    limit: 20,
  });
  for (const c of closePeriods) {
    items.push(buildWorkQueueItem('MONTH_END_EXCEPTION', {
      id: c.id,
      title: `Close period ${c.period} — ${c.status}`,
      severity: c.status === 'IN_PROGRESS' ? 'HIGH' : 'MEDIUM',
    }));
  }

  const filtered = req.query?.type
    ? items.filter((it) => it.type === String(req.query.type).toUpperCase())
    : items;

  return summarizeWorkQueue(filtered);
}

// ——— Copilot ———

function copilotCtx(req) {
  return {
    permissions: req.user?.permissions || req.permissions || [],
    bypassPermission: req.bypassPermission,
    restrictPartnerData: req.restrictPartnerData,
  };
}

async function logCopilotTool(req, { toolName, args, resultSummary, status = 'OK', portfolioId, investorId }) {
  try {
    await InvestmentCopilotToolLog.create(
      withCompanyId(req, {
        userId: userId(req),
        toolName,
        portfolioId: portfolioId || args?.portfolioId || null,
        investorId: investorId || args?.investorId || null,
        argsJson: jsonOrNull(args),
        resultSummary: resultSummary ? String(resultSummary).slice(0, 500) : null,
        status,
      })
    );
  } catch {
    // log table may not exist pre-migration
  }
}

async function invokeCopilotTool(req, data = {}) {
  const toolName = data.toolName || data.tool;
  const args = data.args || data.params || {};
  let status = 'OK';
  let resultData = null;

  try {
    assertCopilotPermission(copilotCtx(req), toolName);
  } catch (e) {
    await logCopilotTool(req, { toolName, args, resultSummary: e.message, status: 'DENIED' });
    throw e;
  }

  const portfolioFilter = { portfolioId: args.portfolioId };
  try {
    switch (toolName) {
      case 'getPortfolioSummary': {
        const holdings = await fetchHoldings(req, portfolioFilter);
        const rows = holdings.map(holdingRow);
        resultData = {
          marketValue: round2(rows.reduce((s, r) => s + r.marketValue, 0)),
          totalCost: round2(rows.reduce((s, r) => s + r.totalCost, 0)),
          holdingCount: rows.length,
          byAssetClass: groupByDimension(rows, (r) => r.assetClass),
        };
        break;
      }
      case 'getPortfolioPerformance': {
        const perf = await InvestmentPerformancePeriod.findOne({
          where: baseWhere(req, portfolioFilter),
          order: [['periodEnd', 'DESC']],
        });
        resultData = perf ? perf.toJSON() : null;
        break;
      }
      case 'getHoldingDetails': {
        const where = { ...companyWhere(req) };
        if (args.holdingId) where.id = Number(args.holdingId);
        if (args.instrumentId) where.instrumentId = Number(args.instrumentId);
        const h = await InvestmentHoldingV2.findOne({
          where,
          include: [{ model: InvestmentInstrument, as: 'instrument' }],
        });
        resultData = h ? holdingRow(h) : null;
        break;
      }
      case 'getInstrumentDetails': {
        const inst = await InvestmentInstrument.findOne({
          where: { id: Number(args.instrumentId), ...companyWhere(req) },
        });
        resultData = inst ? inst.toJSON() : null;
        break;
      }
      case 'getPendingSettlements': {
        const rows = await InvestmentSettlement.findAll({
          where: { ...companyWhere(req), ...testDataWhere(req), status: { [Op.in]: ['PENDING', 'PARTIALLY_SETTLED'] } },
          limit: args.limit || 20,
        });
        resultData = rows.map((s) => s.toJSON());
        break;
      }
      case 'getFailedSettlements': {
        const rows = await InvestmentSettlement.findAll({
          where: { ...companyWhere(req), ...testDataWhere(req), status: 'FAILED' },
          limit: args.limit || 20,
        });
        resultData = rows.map((s) => s.toJSON());
        break;
      }
      case 'getExpectedIncome': {
        const rows = await InvestmentIncomeEvent.findAll({
          where: { ...baseWhere(req, portfolioFilter), status: { [Op.in]: ['EXPECTED', 'ACCRUED', 'RECEIVABLE'] } },
          limit: args.limit || 20,
          order: [['paymentDate', 'ASC']],
        });
        resultData = rows.map((e) => e.toJSON());
        break;
      }
      case 'getOverdueIncome': {
        const today = new Date().toISOString().slice(0, 10);
        const rows = await InvestmentIncomeEvent.findAll({
          where: {
            ...baseWhere(req, portfolioFilter),
            status: { [Op.in]: ['EXPECTED', 'RECEIVABLE'] },
            paymentDate: { [Op.lt]: today },
          },
          limit: args.limit || 20,
        });
        resultData = rows.map((e) => e.toJSON());
        break;
      }
      case 'getUpcomingMaturities': {
        const cutoff = args.asOf || new Date().toISOString().slice(0, 10);
        const horizon = new Date(cutoff);
        horizon.setDate(horizon.getDate() + (args.days || 90));
        const holdings = await fetchHoldings(req, portfolioFilter);
        resultData = holdings
          .filter((h) => h.instrument?.maturityDate && h.instrument.maturityDate <= horizon.toISOString().slice(0, 10))
          .map(holdingRow);
        break;
      }
      case 'getDistributionSummary': {
        const rows = await InvestmentDistributionRun.findAll({
          where: baseWhere(req, portfolioFilter),
          order: [['periodEnd', 'DESC']],
          limit: args.limit || 10,
        });
        resultData = rows.map((d) => ({
          id: d.id,
          distributionNumber: d.distributionNumber,
          netDistributableAmount: round2(d.netDistributableAmount),
          paymentStatus: d.paymentStatus,
          status: d.status,
        }));
        break;
      }
      case 'getInvestorCapitalAccount': {
        const where = baseWhere(req, portfolioFilter);
        if (args.investorId) where.investorId = Number(args.investorId);
        const rows = await InvestmentCapitalAccount.findAll({
          where,
          order: [['period', 'DESC']],
          limit: args.limit || 5,
        });
        resultData = rows.map((a) => a.toJSON());
        break;
      }
      case 'getRiskBreaches': {
        const rows = await InvestmentRiskBreach.findAll({
          where: { ...baseWhere(req, portfolioFilter), status: { [Op.in]: ['OPEN', 'UNDER_REVIEW'] } },
          limit: args.limit || 20,
        });
        resultData = rows.map((b) => b.toJSON());
        break;
      }
      case 'getReconciliationExceptions': {
        const rows = await InvestmentReconciliationBatch.findAll({
          where: { ...baseWhere(req, portfolioFilter), status: { [Op.in]: ['EXCEPTION', 'MATCHING'] } },
          limit: args.limit || 20,
        });
        resultData = rows.map((b) => b.toJSON());
        break;
      }
      case 'getMonthEndExceptions': {
        const rows = await InvestmentClosePeriod.findAll({
          where: { ...baseWhere(req, portfolioFilter), status: { [Op.in]: ['IN_PROGRESS', 'OPEN'] } },
          limit: args.limit || 10,
        });
        resultData = rows.map((c) => c.toJSON());
        break;
      }
      case 'comparePortfolioToBenchmark': {
        const perf = await InvestmentPerformancePeriod.findOne({
          where: baseWhere(req, portfolioFilter),
          order: [['periodEnd', 'DESC']],
        });
        resultData = perf
          ? compareToBenchmark({ portfolioReturn: perf.absoluteReturn, benchmarkReturn: perf.benchmarkReturn })
          : null;
        break;
      }
      case 'explainRealizedGainLoss':
        resultData = explainRealizedGainLoss(args);
        break;
      case 'explainNAVMovement':
        resultData = explainNavMovement(args);
        break;
      default: {
        const err = new Error(`Unhandled copilot tool: ${toolName}`);
        err.statusCode = 400;
        throw err;
      }
    }
  } catch (e) {
    status = 'ERROR';
    await logCopilotTool(req, { toolName, args, resultSummary: e.message, status });
    throw e;
  }

  const summary = Array.isArray(resultData) ? `${resultData.length} rows` : resultData ? 'OK' : 'empty';
  await logCopilotTool(req, {
    toolName,
    args,
    resultSummary: summary,
    status,
    portfolioId: args.portfolioId,
    investorId: args.investorId,
  });

  return groundCopilotResponse(toolName, resultData, {
    companyId: req.companyId,
    portfolioId: args.portfolioId || null,
  });
}

function listCopilotTools() {
  return {
    tools: COPILOT_TOOLS.map((name) => ({ name, readOnly: true })),
    workQueueTypes: WORK_QUEUE_TYPES,
  };
}

module.exports = {
  listReportCatalog,
  runReport,
  listSavedReports,
  createSavedReport,
  listPacks,
  createPack,
  runPack,
  listSchedules,
  createSchedule,
  runDueSchedules,
  listExportHistory,
  getExecutiveDashboard,
  getWorkQueue,
  invokeCopilotTool,
  listCopilotTools,
};
