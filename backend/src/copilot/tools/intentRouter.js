'use strict';

const { normalizeQueryForIntent } = require('./arabicIntent');

/**
 * Heuristic intent → tool calls (leasing + finance + treasury + investment + management).
 */
function selectLeasingTools(query) {
  const q = normalizeQueryForIntent(query).toLowerCase();
  const calls = [];

  if (/\b(vacant|vacancy|available unit|empty units?)\b/.test(q) || /\bunits?\s+are\s+empty\b/.test(q)) {
    calls.push({ toolName: 'getVacantUnits', input: {} });
  }
  if (/\b(occupancy|occupancy rate|how many occupied|occupancy chart|show occupancy)\b/.test(q)) {
    calls.push({ toolName: 'getOccupancySummary', input: {} });
  }
  if (/\b(expir(ing|e)|renewal|upcoming renew)\b/.test(q) && !/\binvestment\b|\bmatur/.test(q)) {
    const daysMatch = q.match(/(\d+)\s*days?/);
    calls.push({
      toolName: 'getExpiringLeases',
      input: { days: daysMatch ? Number(daysMatch[1]) : 90 },
    });
  }
  if (/\b(lease stats|leases by status|how many leases)\b/.test(q)) {
    calls.push({ toolName: 'getLeaseStatsSummary', input: {} });
  }
  if (/\b(portfolio|properties summary|property portfolio|how many propert)\b/.test(q) && !/\binvest/.test(q)) {
    calls.push({ toolName: 'getPropertyPortfolioSummary', input: {} });
  }

  const propertyId = q.match(/property\s+#?(\d+)/);
  if (propertyId) {
    calls.push({ toolName: 'getPropertyDetails', input: { propertyId: Number(propertyId[1]) } });
  } else if (/\bproperty\b/.test(q) && !calls.some((c) => c.toolName.startsWith('getProperty'))) {
    const search = q.replace(/.*property\s+/i, '').slice(0, 60).trim();
    if (search.length > 2) calls.push({ toolName: 'getPropertyDetails', input: { search } });
  }

  const unitId = q.match(/unit\s+#?(\d+)/);
  if (unitId) {
    calls.push({ toolName: 'getUnitDetails', input: { unitId: Number(unitId[1]) } });
  }

  const tenantId = q.match(/tenant\s+#?(\d+)/);
  if (tenantId) {
    calls.push({ toolName: 'getTenantProfile', input: { tenantId: Number(tenantId[1]) } });
  } else if (/\btenant\b/.test(q) && !/\boutstanding|balance|owe|ar\b|receivable/.test(q)) {
    const search = q.replace(/.*tenant\s+/i, '').slice(0, 60).trim();
    if (search.length > 2) calls.push({ toolName: 'getTenantProfile', input: { search } });
  }

  const leaseId = q.match(/lease\s+#?(\d+)/);
  if (leaseId) {
    calls.push({ toolName: 'getLeaseDetails', input: { leaseId: Number(leaseId[1]) } });
  } else if (/\blease\s+[a-z0-9\-]+/i.test(q) && !calls.some((c) => c.toolName === 'getLeaseDetails')) {
    const m = q.match(/lease\s+([a-z0-9\-]+)/i);
    if (m) calls.push({ toolName: 'getLeaseDetails', input: { search: m[1] } });
  }

  return calls;
}

function selectFinanceTools(query) {
  const q = normalizeQueryForIntent(query).toLowerCase();
  const calls = [];

  if (/\b(collection|collected|rent collected|mtd collection)\b/.test(q)) {
    calls.push({ toolName: 'getRentCollectionSummary', input: {} });
  }
  if (/\b(overdue|past due|late rent)\b/.test(q)) {
    calls.push({ toolName: 'getOverdueRent', input: {} });
  }
  if (/\b(aging|receivable|a\/r|ar aging|aging chart|aging report)\b/.test(q)) {
    calls.push({ toolName: 'getReceivableAging', input: {} });
  }
  if (/\b(security deposit|deposits held)\b/.test(q)) {
    calls.push({ toolName: 'getSecurityDepositSummary', input: {} });
  }
  if (/\b(outstanding|owes|balance due)\b/.test(q) && /\btenant\b/.test(q)) {
    const tenantId = q.match(/tenant\s+#?(\d+)/);
    if (tenantId) {
      calls.push({ toolName: 'getTenantOutstanding', input: { tenantId: Number(tenantId[1]) } });
    } else {
      const search = q.replace(/.*tenant\s+/i, '').replace(/\b(outstanding|owes|balance due)\b/gi, '').trim().slice(0, 60);
      if (search.length > 2) calls.push({ toolName: 'getTenantOutstanding', input: { search } });
    }
  }

  return calls;
}

function selectTreasuryTools(query) {
  const q = normalizeQueryForIntent(query).toLowerCase();
  const calls = [];

  if (/\b(cash position|cash balance|liquidity|how much cash)\b/.test(q)) {
    calls.push({ toolName: 'getCashPosition', input: {} });
  }
  if (/\b(bank account|bank balances)\b/.test(q)) {
    calls.push({ toolName: 'getBankAccountSummary', input: {} });
  }
  if (/\b(unreconcil|reconciliation|treasury exception|unreconciled)\b/.test(q)) {
    calls.push({ toolName: 'getTreasuryExceptions', input: {} });
  }

  return calls;
}

function selectInvestmentTools(query) {
  const q = normalizeQueryForIntent(query).toLowerCase();
  const calls = [];

  if (/\b(investment portfolio|portfolio value|investments summary)\b/.test(q) ||
      (/\binvestment\b/.test(q) && /\b(summary|portfolio|value)\b/.test(q))) {
    calls.push({ toolName: 'getInvestmentPortfolioSummary', input: {} });
  }
  if (/\b(matur(ing|ity)|investment matur)\b/.test(q)) {
    const daysMatch = q.match(/(\d+)\s*days?/);
    calls.push({
      toolName: 'getUpcomingInvestmentMaturities',
      input: { days: daysMatch ? Number(daysMatch[1]) : 90 },
    });
  }
  const assetId = q.match(/investment\s+#?(\d+)/);
  if (assetId) {
    calls.push({ toolName: 'getInvestmentHoldingDetails', input: { assetId: Number(assetId[1]) } });
  } else if (/\binvestment\b/.test(q) && !calls.length) {
    const search = q.replace(/.*investment\s+/i, '').slice(0, 60).trim();
    if (search.length > 2 && !/\b(summary|portfolio|value|matur)/.test(search)) {
      calls.push({ toolName: 'getInvestmentHoldingDetails', input: { search } });
    } else if (!calls.length) {
      calls.push({ toolName: 'getInvestmentPortfolioSummary', input: {} });
    }
  }

  return calls;
}

function selectManagementTools(query) {
  const q = normalizeQueryForIntent(query).toLowerCase();
  const calls = [];

  if (/\b(daily leasing brief|leasing brief|management leasing)\b/.test(q)) {
    calls.push({ toolName: 'getDailyLeasingBrief', input: {} });
  }
  if (/\b(collection risk|collections brief|risk brief)\b/.test(q)) {
    calls.push({ toolName: 'getCollectionRiskBrief', input: {} });
  }
  if (/\b(expiry brief|upcoming expir|renewal brief)\b/.test(q)) {
    const daysMatch = q.match(/(\d+)\s*days?/);
    calls.push({
      toolName: 'getUpcomingExpiryBrief',
      input: { days: daysMatch ? Number(daysMatch[1]) : 90 },
    });
  }
  if (/\b(occupancy brief|occupancy by property)\b/.test(q)) {
    calls.push({ toolName: 'getOccupancyBrief', input: {} });
  }

  return calls;
}

function selectTools(query) {
  const seen = new Set();
  const merged = [
    ...selectManagementTools(query),
    ...selectFinanceTools(query),
    ...selectTreasuryTools(query),
    ...selectInvestmentTools(query),
    ...selectLeasingTools(query),
  ];
  return merged
    .filter((c) => {
      if (seen.has(c.toolName)) return false;
      seen.add(c.toolName);
      return true;
    })
    .slice(0, 3);
}

module.exports = {
  selectLeasingTools,
  selectFinanceTools,
  selectTreasuryTools,
  selectInvestmentTools,
  selectManagementTools,
  selectTools,
};
