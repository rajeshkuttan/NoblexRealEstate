'use strict';

/**
 * Grounded chart specs for Copilot UI (no LLM-invented series).
 * Shape: { type, title, xKey, yKey, series: [{ label, value }] }
 */

function chart(type, title, series) {
  const clean = (series || [])
    .filter((s) => s && s.label != null && Number.isFinite(Number(s.value)))
    .map((s) => ({ label: String(s.label), value: Number(s.value) }));
  if (!clean.length) return null;
  return { type, title, xKey: 'label', yKey: 'value', series: clean };
}

function buildOccupancyChart(data) {
  if (!data) return null;
  return chart('pie', 'Occupancy', [
    { label: 'Occupied', value: data.occupied || 0 },
    { label: 'Available', value: data.available || 0 },
    { label: 'Other', value: data.other || 0 },
  ]);
}

function buildAgingChart(data) {
  const amounts = data?.amounts || data;
  if (!amounts || typeof amounts !== 'object') return null;
  const labels = {
    current: 'Current',
    d1_30: '1–30',
    d31_60: '31–60',
    d61_90: '61–90',
    d90_plus: '90+',
  };
  return chart(
    'bar',
    'Receivable aging (amount)',
    Object.keys(labels).map((k) => ({ label: labels[k], value: amounts[k] || 0 }))
  );
}

function buildExpiringLeasesChart(data) {
  if (!data) return null;
  return chart('bar', `Leases expiring (${data.days || '?'} days)`, [
    { label: 'Expiring', value: data.count || 0 },
  ]);
}

function buildCashPositionChart(data) {
  if (!data?.accounts?.length) {
    if (data?.byCurrency) {
      return chart(
        'bar',
        'Cash by currency',
        Object.entries(data.byCurrency).map(([label, value]) => ({ label, value }))
      );
    }
    return null;
  }
  return chart(
    'bar',
    'Cash by account',
    data.accounts.slice(0, 12).map((a) => ({
      label: a.accountName || a.bankName || `#${a.id}`,
      value: a.currentBalance || 0,
    }))
  );
}

function buildUnitsByStatusChart(data) {
  const by = data?.unitsByStatus;
  if (!by || typeof by !== 'object') return null;
  return chart(
    'bar',
    'Units by status',
    Object.entries(by).map(([label, value]) => ({ label, value }))
  );
}

function buildLeaseStatsChart(data) {
  const by = data?.byStatus;
  if (!by || typeof by !== 'object') return null;
  return chart(
    'bar',
    'Leases by status',
    Object.entries(by).map(([label, value]) => ({ label, value }))
  );
}

function buildOccupancyByPropertyChart(data) {
  const rows = data?.byProperty;
  if (!Array.isArray(rows) || !rows.length) return null;
  return chart(
    'bar',
    'Occupancy % by property',
    rows.slice(0, 12).map((r) => ({
      label: (r.title || `P${r.propertyId}`).slice(0, 24),
      value: r.occupancyRate || 0,
    }))
  );
}

function buildOverdueChart(data) {
  if (!data) return null;
  return chart('bar', 'Overdue rent', [
    { label: 'Invoices', value: data.count || 0 },
    { label: 'Total amount', value: data.totalOverdue || 0 },
  ]);
}

function buildMonthlyRevenueChart(data) {
  const months = data?.months;
  if (!Array.isArray(months) || !months.length) return null;
  return chart(
    'bar',
    `Monthly collected revenue (${data.year || ''})`,
    months.map((m) => ({
      label: m.label || String(m.month),
      value: m.collected || 0,
    }))
  );
}

/**
 * Map toolName + payload → chart artifact or null.
 */
function chartFromToolResult(toolName, data) {
  if (!data || data.status === 'failed') return null;
  switch (toolName) {
    case 'getOccupancySummary':
      return buildOccupancyChart(data);
    case 'getReceivableAging':
      return buildAgingChart(data);
    case 'getExpiringLeases':
      return buildExpiringLeasesChart(data);
    case 'getCashPosition':
    case 'getBankAccountSummary':
      return buildCashPositionChart(data);
    case 'getPropertyPortfolioSummary':
      return buildUnitsByStatusChart(data);
    case 'getLeaseStatsSummary':
      return buildLeaseStatsChart(data);
    case 'getOccupancyBrief':
      return buildOccupancyByPropertyChart(data) || buildOccupancyChart(data.occupancy);
    case 'getDailyLeasingBrief':
      return buildOccupancyChart(data.occupancy);
    case 'getCollectionRiskBrief':
      return buildAgingChart(data.aging) || buildOverdueChart(data);
    case 'getOverdueRent':
      return buildOverdueChart(data);
    case 'getMonthlyRevenue':
      return buildMonthlyRevenueChart(data);
    default:
      return null;
  }
}

/**
 * Tabular rows for Excel export (best-effort).
 */
function tableFromToolResult(toolName, data) {
  if (!data || typeof data !== 'object') return null;
  const pick = (arr, name) =>
    Array.isArray(arr) && arr.length
      ? { toolName, name, rows: arr.slice(0, 500) }
      : null;

  return (
    pick(data.invoices, 'invoices') ||
    pick(data.leases, 'leases') ||
    pick(data.units, 'units') ||
    pick(data.accounts, 'accounts') ||
    pick(data.properties, 'properties') ||
    pick(data.recentPayments, 'payments') ||
    pick(data.months, 'monthlyRevenue') ||
    pick(data.byProperty, 'byProperty') ||
    pick(data.topOverdue, 'topOverdue') ||
    pick(data.openReconciliations, 'reconciliations') ||
    null
  );
}

function artifactsFromToolResults(toolResults) {
  const artifacts = [];
  for (const t of toolResults || []) {
    if (t.status !== 'success' || !t.data) continue;
    const c = chartFromToolResult(t.toolName, t.data);
    if (c) artifacts.push({ type: 'chart', toolName: t.toolName, chart: c });
    const table = tableFromToolResult(t.toolName, t.data);
    if (table) artifacts.push({ type: 'table', toolName: t.toolName, table });
  }
  return artifacts;
}

module.exports = {
  chart,
  buildOccupancyChart,
  buildAgingChart,
  buildExpiringLeasesChart,
  buildCashPositionChart,
  buildUnitsByStatusChart,
  buildLeaseStatsChart,
  buildOccupancyByPropertyChart,
  buildOverdueChart,
  buildMonthlyRevenueChart,
  chartFromToolResult,
  tableFromToolResult,
  artifactsFromToolResults,
};
