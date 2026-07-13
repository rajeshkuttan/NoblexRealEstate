'use strict';

const { chunkText } = require('../../copilot/ingestion/chunker');
const { selectLeasingTools } = require('../../copilot/tools/intentRouter');
const { hasPermission } = require('../../copilot/tools/executor');
const { validateUpload } = require('../../copilot/ingestion/documentService');
const { getAllowedMimeTypes } = require('../../copilot/config/copilotConfig');

// Avoid loading Sequelize models for registry metadata checks
jest.mock('../../copilot/tools/leasing/leasingTools', () => ({
  getPropertyPortfolioSummary: jest.fn(),
  getPropertyDetails: jest.fn(),
  getUnitDetails: jest.fn(),
  getVacantUnits: jest.fn(),
  getOccupancySummary: jest.fn(),
  getTenantProfile: jest.fn(),
  getLeaseDetails: jest.fn(),
  getExpiringLeases: jest.fn(),
  getLeaseStatsSummary: jest.fn(),
}));

jest.mock('../../copilot/tools/finance/financeTools', () => ({
  getRentCollectionSummary: jest.fn(),
  getOverdueRent: jest.fn(),
  getReceivableAging: jest.fn(),
  getTenantOutstanding: jest.fn(),
  getSecurityDepositSummary: jest.fn(),
}));

jest.mock('../../copilot/tools/treasury/treasuryTools', () => ({
  getCashPosition: jest.fn(),
  getBankAccountSummary: jest.fn(),
  getTreasuryExceptions: jest.fn(),
}));

jest.mock('../../copilot/tools/investment/investmentTools', () => ({
  getInvestmentPortfolioSummary: jest.fn(),
  getInvestmentHoldingDetails: jest.fn(),
  getUpcomingInvestmentMaturities: jest.fn(),
}));

jest.mock('../../copilot/tools/management/managementTools', () => ({
  getDailyLeasingBrief: jest.fn(),
  getCollectionRiskBrief: jest.fn(),
  getUpcomingExpiryBrief: jest.fn(),
  getOccupancyBrief: jest.fn(),
}));

jest.mock('../../models', () => ({
  CopilotDocument: {},
  CopilotDocumentChunk: {},
  CopilotToolRun: { create: jest.fn() },
}));

const { getTool, listTools } = require('../../copilot/tools/registry');

describe('Copilot chunker', () => {
  test('splits long text into overlapping chunks', () => {
    const text = 'A'.repeat(2500);
    const chunks = chunkText(text, { size: 1000, overlap: 100 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].content).toHaveLength(1000);
    expect(chunks[0].contentHash).toBeTruthy();
  });

  test('returns empty for blank', () => {
    expect(chunkText('   ')).toEqual([]);
  });
});

describe('Copilot upload validation', () => {
  const prev = process.env.COPILOT_MAX_FILE_SIZE;
  afterAll(() => {
    if (prev === undefined) delete process.env.COPILOT_MAX_FILE_SIZE;
    else process.env.COPILOT_MAX_FILE_SIZE = prev;
  });

  test('rejects missing file', () => {
    expect(() => validateUpload(null)).toThrow(/required/i);
  });

  test('rejects oversized file', () => {
    process.env.COPILOT_MAX_FILE_SIZE = '100';
    expect(() =>
      validateUpload({ size: 500, mimetype: 'text/plain', originalname: 'a.txt' })
    ).toThrow(/max size/i);
  });

  test('rejects disallowed mime', () => {
    process.env.COPILOT_MAX_FILE_SIZE = '10485760';
    expect(() =>
      validateUpload({ size: 10, mimetype: 'application/zip', originalname: 'a.zip' })
    ).toThrow(/MIME/i);
  });

  test('allows configured mime', () => {
    expect(getAllowedMimeTypes()).toContain('application/pdf');
    expect(() =>
      validateUpload({ size: 10, mimetype: 'text/plain', originalname: 'a.txt' })
    ).not.toThrow();
  });
});

describe('Copilot leasing tool selection', () => {
  test('routes vacant units', () => {
    const calls = selectLeasingTools('How many vacant units do we have?');
    expect(calls.map((c) => c.toolName)).toContain('getVacantUnits');
  });

  test('routes expiring leases with days', () => {
    const calls = selectLeasingTools('Show leases expiring in 30 days');
    expect(calls[0].toolName).toBe('getExpiringLeases');
    expect(calls[0].input.days).toBe(30);
  });

  test('routes occupancy', () => {
    expect(selectLeasingTools('What is our occupancy rate?')[0].toolName).toBe(
      'getOccupancySummary'
    );
  });
});

describe('Copilot tool registry RBAC metadata', () => {
  test('each leasing tool declares ERP permission', () => {
    const tools = listTools();
    expect(tools.length).toBeGreaterThanOrEqual(20);
    for (const t of tools) {
      expect(t.requiredPermission).toMatch(/^module:/);
    }
  });

  test('hasPermission checks codes', () => {
    expect(hasPermission(['module:units:view'], 'module:units:view')).toBe(true);
    expect(hasPermission([], 'module:units:view')).toBe(false);
  });

  test('getVacantUnits requires units view', () => {
    expect(getTool('getVacantUnits').requiredPermission).toBe('module:units:view');
  });
});

describe('Copilot phase 2 wiring', () => {
  const fs = require('fs');
  const path = require('path');
  const read = (p) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');

  test('routes expose documents endpoints', () => {
    const routes = read('copilot/routes/copilotRoutes.js');
    expect(routes).toMatch(/\/documents/);
    expect(routes).toMatch(/module:copilot:documents/);
  });

  test('chunk content migration exists', () => {
    expect(
      fs.existsSync(path.join(__dirname, '../../migrations/20260713120000-copilot-chunk-content.js'))
    ).toBe(true);
  });

  test('server starts indexer', () => {
    expect(read('server.js')).toMatch(/startIndexerWorker/);
  });
});
