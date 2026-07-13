'use strict';

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

const { selectManagementTools, selectTools } = require('../../copilot/tools/intentRouter');
const { getTool, listTools } = require('../../copilot/tools/registry');
const { runCase, loadGoldenCases } = require('../../copilot/evaluation/evaluationRunner');

describe('Copilot management tool selection', () => {
  test('routes daily leasing brief', () => {
    expect(selectManagementTools('Give me the daily leasing brief')[0].toolName).toBe(
      'getDailyLeasingBrief'
    );
  });

  test('routes collection risk brief', () => {
    expect(selectManagementTools('Show collection risk brief')[0].toolName).toBe(
      'getCollectionRiskBrief'
    );
  });

  test('routes expiry brief with days', () => {
    const calls = selectManagementTools('Upcoming expiry brief for 60 days');
    expect(calls[0].toolName).toBe('getUpcomingExpiryBrief');
    expect(calls[0].input.days).toBe(60);
  });

  test('routes occupancy brief', () => {
    expect(selectManagementTools('Occupancy brief by property')[0].toolName).toBe(
      'getOccupancyBrief'
    );
  });

  test('selectTools prefers management brief over generic occupancy', () => {
    const names = selectTools('daily leasing brief and occupancy').map((c) => c.toolName);
    expect(names).toContain('getDailyLeasingBrief');
  });
});

describe('Copilot management registry', () => {
  test('registers four management tools', () => {
    const names = listTools().map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'getDailyLeasingBrief',
        'getCollectionRiskBrief',
        'getUpcomingExpiryBrief',
        'getOccupancyBrief',
      ])
    );
  });

  test('daily leasing brief requires dashboard view', () => {
    expect(getTool('getDailyLeasingBrief').requiredPermission).toBe('module:dashboard:view');
  });
});

describe('Copilot phase 6 golden cases', () => {
  test('includes management cases', () => {
    const cases = loadGoldenCases().filter((c) => c.category === 'management');
    expect(cases.length).toBeGreaterThanOrEqual(4);
  });

  test('daily leasing brief case passes', () => {
    const result = runCase(
      {
        id: 'x',
        question: 'Give me the daily leasing brief',
        expectedTool: 'getDailyLeasingBrief',
        requiredPermissions: ['module:dashboard:view'],
      },
      { userPermissions: ['module:dashboard:view'] }
    );
    expect(result.passed).toBe(true);
  });
});

describe('Copilot phase 6 product wiring', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '../../../..');

  test('AskCopilotButton exists and is used on key entities', () => {
    const button = fs.readFileSync(
      path.join(root, 'src/components/copilot/AskCopilotButton.tsx'),
      'utf8'
    );
    expect(button).toMatch(/Ask Copilot/);
    expect(
      fs.readFileSync(path.join(root, 'src/pages/Properties.tsx'), 'utf8')
    ).toMatch(/AskCopilotButton/);
    expect(
      fs.readFileSync(path.join(root, 'src/components/units/UnitDetails.tsx'), 'utf8')
    ).toMatch(/AskCopilotButton/);
    expect(
      fs.readFileSync(path.join(root, 'src/pages/Tenants.tsx'), 'utf8')
    ).toMatch(/AskCopilotButton/);
    expect(
      fs.readFileSync(path.join(root, 'src/components/leases/LeaseDetails.tsx'), 'utf8')
    ).toMatch(/AskCopilotButton/);
    expect(
      fs.readFileSync(path.join(root, 'src/components/helpdesk/TicketDetails.tsx'), 'utf8')
    ).toMatch(/AskCopilotButton/);
  });

  test('health reports phase 6+ management domain', () => {
    const ctrl = fs.readFileSync(
      path.join(__dirname, '../../copilot/controllers/copilotController.js'),
      'utf8'
    );
    expect(ctrl).toMatch(/phase:\s*[6-9]/);
    expect(ctrl).toMatch(/management/);
  });
});
