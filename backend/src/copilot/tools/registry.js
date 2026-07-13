'use strict';

const leasing = require('./leasing/leasingTools');
const finance = require('./finance/financeTools');
const treasury = require('./treasury/treasuryTools');
const investment = require('./investment/investmentTools');
const management = require('./management/managementTools');

/**
 * Controlled tool registry (Phase 2 leasing + Phase 3 finance/treasury/investment).
 */
const TOOLS = {
  getPropertyPortfolioSummary: {
    name: 'getPropertyPortfolioSummary',
    description: 'Summarize properties and unit occupancy for the company',
    module: 'properties',
    requiredPermission: 'module:properties:view',
    handler: leasing.getPropertyPortfolioSummary,
  },
  getPropertyDetails: {
    name: 'getPropertyDetails',
    description: 'Get property details by id or search text',
    module: 'properties',
    requiredPermission: 'module:properties:view',
    handler: leasing.getPropertyDetails,
  },
  getUnitDetails: {
    name: 'getUnitDetails',
    description: 'Get unit details by id or unit number',
    module: 'units',
    requiredPermission: 'module:units:view',
    handler: leasing.getUnitDetails,
  },
  getVacantUnits: {
    name: 'getVacantUnits',
    description: 'List vacant/available units',
    module: 'units',
    requiredPermission: 'module:units:view',
    handler: leasing.getVacantUnits,
  },
  getOccupancySummary: {
    name: 'getOccupancySummary',
    description: 'Occupancy rates and unit status counts',
    module: 'units',
    requiredPermission: 'module:units:view',
    handler: leasing.getOccupancySummary,
  },
  getTenantProfile: {
    name: 'getTenantProfile',
    description: 'Get tenant profile by id or name/email search',
    module: 'tenants',
    requiredPermission: 'module:tenants:view',
    handler: leasing.getTenantProfile,
  },
  getLeaseDetails: {
    name: 'getLeaseDetails',
    description: 'Get lease details by id or lease number',
    module: 'leases',
    requiredPermission: 'module:leases:view',
    handler: leasing.getLeaseDetails,
  },
  getExpiringLeases: {
    name: 'getExpiringLeases',
    description: 'List leases expiring within N days (default 90)',
    module: 'leases',
    requiredPermission: 'module:leases:view',
    handler: leasing.getExpiringLeases,
  },
  getLeaseStatsSummary: {
    name: 'getLeaseStatsSummary',
    description: 'Lease counts by status',
    module: 'leases',
    requiredPermission: 'module:leases:view',
    handler: leasing.getLeaseStatsSummary,
  },

  getRentCollectionSummary: {
    name: 'getRentCollectionSummary',
    description: 'MTD rent collection summary and open invoices',
    module: 'finance',
    requiredPermission: 'module:finance:view',
    handler: finance.getRentCollectionSummary,
  },
  getOverdueRent: {
    name: 'getOverdueRent',
    description: 'Overdue rent invoices',
    module: 'finance',
    requiredPermission: 'module:finance:view',
    handler: finance.getOverdueRent,
  },
  getReceivableAging: {
    name: 'getReceivableAging',
    description: 'AR aging buckets for open invoices',
    module: 'finance',
    requiredPermission: 'module:finance:view',
    handler: finance.getReceivableAging,
  },
  getTenantOutstanding: {
    name: 'getTenantOutstanding',
    description: 'Outstanding invoices for a tenant',
    module: 'finance',
    requiredPermission: 'module:finance:view',
    handler: finance.getTenantOutstanding,
  },
  getSecurityDepositSummary: {
    name: 'getSecurityDepositSummary',
    description: 'Security deposit totals by status',
    module: 'finance',
    requiredPermission: 'module:finance:view',
    handler: finance.getSecurityDepositSummary,
  },

  getCashPosition: {
    name: 'getCashPosition',
    description: 'Bank cash position by currency',
    module: 'treasury',
    requiredPermission: 'module:treasury:view',
    handler: treasury.getCashPosition,
  },
  getBankAccountSummary: {
    name: 'getBankAccountSummary',
    description: 'List bank accounts and balances',
    module: 'treasury',
    requiredPermission: 'module:treasury:view',
    handler: treasury.getBankAccountSummary,
  },
  getTreasuryExceptions: {
    name: 'getTreasuryExceptions',
    description: 'Unreconciled transactions and open reconciliations',
    module: 'treasury',
    requiredPermission: 'module:treasury:view',
    handler: treasury.getTreasuryExceptions,
  },

  getInvestmentPortfolioSummary: {
    name: 'getInvestmentPortfolioSummary',
    description: 'Investment portfolio cost, market value, and P&L',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getInvestmentPortfolioSummary,
  },
  getInvestmentHoldingDetails: {
    name: 'getInvestmentHoldingDetails',
    description: 'Investment asset/holding details by id or search',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getInvestmentHoldingDetails,
  },
  getUpcomingInvestmentMaturities: {
    name: 'getUpcomingInvestmentMaturities',
    description: 'Investments maturing within N days',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getUpcomingInvestmentMaturities,
  },

  // Phase 24 — grounded investment intelligence tools
  getPortfolioSummary: {
    name: 'getPortfolioSummary',
    description: 'Investment v2 portfolio summary (holdings MV/cost)',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getPortfolioSummary,
  },
  getPortfolioPerformance: {
    name: 'getPortfolioPerformance',
    description: 'Recent investment performance periods (TWR/MWR/IRR)',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getPortfolioPerformance,
  },
  getHoldingDetails: {
    name: 'getHoldingDetails',
    description: 'Investment holdings_v2 details for a portfolio',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getHoldingDetails,
  },
  getInstrumentDetails: {
    name: 'getInstrumentDetails',
    description: 'Instrument master details by instrumentId',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getInstrumentDetails,
  },
  getPendingSettlements: {
    name: 'getPendingSettlements',
    description: 'Pending investment settlements',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getPendingSettlements,
  },
  getFailedSettlements: {
    name: 'getFailedSettlements',
    description: 'Failed investment settlements',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getFailedSettlements,
  },
  getExpectedIncome: {
    name: 'getExpectedIncome',
    description: 'Expected / accrued investment income events',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getExpectedIncome,
  },
  getOverdueIncome: {
    name: 'getOverdueIncome',
    description: 'Overdue investment income events',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getOverdueIncome,
  },
  getUpcomingMaturities: {
    name: 'getUpcomingMaturities',
    description: 'Holdings maturing within N days (v2 instruments)',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getUpcomingMaturities,
  },
  getDistributionSummary: {
    name: 'getDistributionSummary',
    description: 'Partner distribution runs summary',
    module: 'investment',
    requiredPermission: 'module:investment:reports',
    handler: investment.getDistributionSummary,
  },
  getInvestorCapitalAccount: {
    name: 'getInvestorCapitalAccount',
    description: 'Investor capital account balances (partner-sensitive)',
    module: 'investment',
    requiredPermission: 'module:investment:reports',
    handler: investment.getInvestorCapitalAccount,
  },
  getRiskBreaches: {
    name: 'getRiskBreaches',
    description: 'Open / under-review investment risk breaches',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getRiskBreaches,
  },
  getReconciliationExceptions: {
    name: 'getReconciliationExceptions',
    description: 'Reconciliation batches in EXCEPTION status',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getReconciliationExceptions,
  },
  getMonthEndExceptions: {
    name: 'getMonthEndExceptions',
    description: 'Open / in-progress investment close periods',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.getMonthEndExceptions,
  },
  comparePortfolioToBenchmark: {
    name: 'comparePortfolioToBenchmark',
    description: 'Compare latest portfolio return vs benchmark',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.comparePortfolioToBenchmark,
  },
  explainRealizedGainLoss: {
    name: 'explainRealizedGainLoss',
    description: 'Explain realized P/L from proceeds, cost, fees, FX',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.explainRealizedGainLoss,
  },
  explainNAVMovement: {
    name: 'explainNAVMovement',
    description: 'Explain NAV bridge (contributions, income, P/L)',
    module: 'investment',
    requiredPermission: 'module:investment:view',
    handler: investment.explainNAVMovement,
  },

  getDailyLeasingBrief: {
    name: 'getDailyLeasingBrief',
    description: 'Management daily leasing brief (occupancy, vacancy, near expiries)',
    module: 'reports',
    requiredPermission: 'module:dashboard:view',
    handler: management.getDailyLeasingBrief,
  },
  getCollectionRiskBrief: {
    name: 'getCollectionRiskBrief',
    description: 'Management collection risk brief (overdue, aging, MTD collections)',
    module: 'reports',
    requiredPermission: 'module:finance:view',
    handler: management.getCollectionRiskBrief,
  },
  getUpcomingExpiryBrief: {
    name: 'getUpcomingExpiryBrief',
    description: 'Management brief of leases expiring soon',
    module: 'reports',
    requiredPermission: 'module:leases:view',
    handler: management.getUpcomingExpiryBrief,
  },
  getOccupancyBrief: {
    name: 'getOccupancyBrief',
    description: 'Occupancy brief by property',
    module: 'reports',
    requiredPermission: 'module:units:view',
    handler: management.getOccupancyBrief,
  },
};

function getTool(name) {
  return TOOLS[name] || null;
}

function listTools() {
  return Object.values(TOOLS).map(({ handler, ...meta }) => meta);
}

module.exports = {
  TOOLS,
  getTool,
  listTools,
};
