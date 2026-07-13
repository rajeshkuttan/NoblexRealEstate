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
