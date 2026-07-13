'use strict';

const fs = require('fs');
const path = require('path');
const {
  materializeExport,
  buildExcelBuffer,
  buildCsvString,
} = require('../../services/investment/intelligence/investmentReportExport.service');
const { shapeReport } = require('../../services/investment/intelligence/intelligenceEngine.service');
const { listTools, getTool } = require('../../copilot/tools/registry');

describe('Investment report export hardening', () => {
  const report = shapeReport('PORTFOLIO_SUMMARY', {
    rows: [
      { instrumentCode: 'A', marketValue: 100 },
      { instrumentCode: 'B', marketValue: 200 },
    ],
    summary: { rowCount: 2 },
    filters: { portfolioId: 1 },
  });

  test('buildExcelBuffer is real xlsx', () => {
    const buf = buildExcelBuffer(report);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
    // ZIP/XLSX magic
    expect(buf.slice(0, 2).toString()).toBe('PK');
  });

  test('buildCsvString includes header', () => {
    const csv = buildCsvString(report);
    expect(csv).toContain('instrumentCode');
    expect(csv).toContain('A');
  });

  test('materializeExport PDF writes file', async () => {
    const out = await materializeExport(report, 'PDF', { companyId: 999001, writeFile: true });
    expect(out.stub).toBe(false);
    expect(out.format).toBe('PDF');
    expect(out.mime).toBe('application/pdf');
    expect(out.base64).toBeTruthy();
    expect(out.fileRef).toBeTruthy();
    expect(fs.existsSync(out.fileRef)).toBe(true);
    const header = Buffer.from(out.base64, 'base64').slice(0, 4).toString();
    expect(header).toBe('%PDF');
    fs.unlinkSync(out.fileRef);
  });

  test('materializeExport EXCEL writes file', async () => {
    const out = await materializeExport(report, 'EXCEL', { companyId: 999001, writeFile: true });
    expect(out.format).toBe('EXCEL');
    expect(out.byteLength).toBeGreaterThan(100);
    expect(fs.existsSync(out.fileRef)).toBe(true);
    fs.unlinkSync(out.fileRef);
  });
});

describe('Phase 24 tools registered in Copilot registry', () => {
  const expected = [
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

  test('all Phase 24 tools present', () => {
    const names = listTools().map((t) => t.name);
    for (const n of expected) {
      expect(names).toContain(n);
    }
  });

  test('partner tools require reports permission', () => {
    expect(getTool('getInvestorCapitalAccount').requiredPermission).toBe('module:investment:reports');
    expect(getTool('getDistributionSummary').requiredPermission).toBe('module:investment:reports');
  });

  test('handlers are functions', () => {
    for (const n of expected) {
      expect(typeof getTool(n).handler).toBe('function');
    }
  });
});
