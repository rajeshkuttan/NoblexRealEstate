'use strict';

const {
  selectTools,
  selectFinanceTools,
  selectTreasuryTools,
  selectInvestmentTools,
} = require('../../copilot/tools/intentRouter');

jest.mock('../../copilot/tools/leasing/leasingTools', () => ({}));
jest.mock('../../copilot/tools/finance/financeTools', () => ({}));
jest.mock('../../copilot/tools/treasury/treasuryTools', () => ({}));
jest.mock('../../copilot/tools/investment/investmentTools', () => ({}));
jest.mock('../../models', () => ({ CopilotToolRun: { create: jest.fn() } }));

const { getTool, listTools } = require('../../copilot/tools/registry');

describe('Copilot Phase 3 intent routing', () => {
  test('routes overdue rent', () => {
    expect(selectFinanceTools('Show overdue rent')[0].toolName).toBe('getOverdueRent');
  });

  test('routes AR aging', () => {
    expect(selectFinanceTools('What is our AR aging?')[0].toolName).toBe('getReceivableAging');
  });

  test('routes collections', () => {
    expect(selectFinanceTools('MTD rent collection summary')[0].toolName).toBe(
      'getRentCollectionSummary'
    );
  });

  test('routes monthly revenue with year', () => {
    const calls = selectFinanceTools('generate the monthly revenue of 2026');
    expect(calls[0].toolName).toBe('getMonthlyRevenue');
    expect(calls[0].input.year).toBe(2026);
  });

  test('routes cash position', () => {
    expect(selectTreasuryTools('What is our cash position?')[0].toolName).toBe('getCashPosition');
  });

  test('routes investment portfolio', () => {
    expect(selectInvestmentTools('investment portfolio value')[0].toolName).toBe(
      'getInvestmentPortfolioSummary'
    );
  });

  test('routes investment maturities', () => {
    const calls = selectInvestmentTools('investments maturing in 60 days');
    expect(calls[0].toolName).toBe('getUpcomingInvestmentMaturities');
    expect(calls[0].input.days).toBe(60);
  });

  test('selectTools merges domains and caps at 3', () => {
    const calls = selectTools('overdue rent and cash position and vacant units');
    expect(calls.length).toBeLessThanOrEqual(3);
    expect(calls.map((c) => c.toolName)).toEqual(
      expect.arrayContaining(['getOverdueRent', 'getCashPosition'])
    );
  });
});

describe('Copilot Phase 3 registry', () => {
  test('registers finance treasury investment tools with permissions', () => {
    expect(getTool('getReceivableAging').requiredPermission).toBe('module:finance:view');
    expect(getTool('getMonthlyRevenue').requiredPermission).toBe('module:finance:view');
    expect(getTool('getCashPosition').requiredPermission).toBe('module:treasury:view');
    expect(getTool('getInvestmentPortfolioSummary').requiredPermission).toBe(
      'module:investment:view'
    );
    expect(listTools().some((t) => t.module === 'finance')).toBe(true);
    expect(listTools().some((t) => t.module === 'treasury')).toBe(true);
    expect(listTools().some((t) => t.module === 'investment')).toBe(true);
  });
});
