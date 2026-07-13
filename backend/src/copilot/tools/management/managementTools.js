'use strict';

const { Op } = require('sequelize');
const {
  Property,
  Unit,
  Tenant,
} = require('../../../models');
const leasing = require('../leasing/leasingTools');
const finance = require('../finance/financeTools');

/**
 * Management intelligence briefs (read-only aggregates).
 */
async function getDailyLeasingBrief({ companyId }) {
  const [occupancy, vacant, expiring, leaseStats, properties] = await Promise.all([
    leasing.getOccupancySummary({ companyId }),
    leasing.getVacantUnits({ companyId }),
    leasing.getExpiringLeases({ companyId, days: 30 }),
    leasing.getLeaseStatsSummary({ companyId }),
    Property.count({ where: { companyId } }),
  ]);

  return {
    asOf: new Date().toISOString().slice(0, 10),
    properties,
    occupancy,
    vacantUnits: vacant.count,
    leasesExpiringIn30Days: expiring.count,
    leaseStats,
    highlights: [
      `Occupancy ${occupancy.occupancyRate}% (${occupancy.occupied}/${occupancy.total} units)`,
      `${vacant.count} vacant units available`,
      `${expiring.count} leases expiring within 30 days`,
      `${leaseStats.byStatus?.active || 0} active leases`,
    ],
  };
}

async function getCollectionRiskBrief({ companyId }) {
  const [overdue, aging, collections, deposits] = await Promise.all([
    finance.getOverdueRent({ companyId }),
    finance.getReceivableAging({ companyId }),
    finance.getRentCollectionSummary({ companyId }),
    finance.getSecurityDepositSummary({ companyId }),
  ]);

  const riskLevel =
    overdue.totalOverdue > 100000 ? 'high' : overdue.totalOverdue > 25000 ? 'medium' : 'low';

  return {
    asOf: new Date().toISOString().slice(0, 10),
    riskLevel,
    overdueCount: overdue.count,
    totalOverdue: overdue.totalOverdue,
    aging: aging.amounts,
    mtdCollected: collections.totalCollected,
    depositsHeld: deposits.heldTotal,
    topOverdue: (overdue.invoices || []).slice(0, 10),
    highlights: [
      `Collection risk: ${riskLevel}`,
      `${overdue.count} overdue invoices totaling ${overdue.totalOverdue}`,
      `MTD collected: ${collections.totalCollected}`,
      `Deposits held: ${deposits.heldTotal}`,
    ],
  };
}

async function getUpcomingExpiryBrief({ companyId, days = 90 }) {
  const expiring = await leasing.getExpiringLeases({ companyId, days });
  const leaseIds = (expiring.leases || []).map((l) => l.id);
  let tenantsById = {};
  if (leaseIds.length) {
    const tenantIds = [...new Set((expiring.leases || []).map((l) => l.tenantId).filter(Boolean))];
    if (tenantIds.length) {
      const tenants = await Tenant.findAll({
        where: { companyId, id: { [Op.in]: tenantIds } },
        attributes: ['id', 'name'],
      });
      tenantsById = Object.fromEntries(tenants.map((t) => [t.id, t.name]));
    }
  }

  return {
    asOf: new Date().toISOString().slice(0, 10),
    days: expiring.days,
    count: expiring.count,
    leases: (expiring.leases || []).map((l) => ({
      ...l,
      tenantName: tenantsById[l.tenantId] || null,
    })),
    highlights: [
      `${expiring.count} leases expire within ${expiring.days} days`,
      ...(expiring.leases || [])
        .slice(0, 5)
        .map(
          (l) =>
            `${l.leaseNumber} ends ${l.endDate}` +
            (tenantsById[l.tenantId] ? ` (${tenantsById[l.tenantId]})` : '')
        ),
    ],
  };
}

async function getOccupancyBrief({ companyId }) {
  const [occupancy, vacant, byProperty] = await Promise.all([
    leasing.getOccupancySummary({ companyId }),
    leasing.getVacantUnits({ companyId }),
    Unit.findAll({
      where: { companyId },
      attributes: ['propertyId', 'status'],
    }),
  ]);

  const propertyMap = {};
  for (const u of byProperty) {
    if (!propertyMap[u.propertyId]) {
      propertyMap[u.propertyId] = { total: 0, available: 0, occupied: 0 };
    }
    propertyMap[u.propertyId].total += 1;
    if (u.status === 'available') propertyMap[u.propertyId].available += 1;
    if (u.status === 'occupied') propertyMap[u.propertyId].occupied += 1;
  }

  const propertyIds = Object.keys(propertyMap).map(Number).slice(0, 25);
  const props = propertyIds.length
    ? await Property.findAll({
        where: { companyId, id: { [Op.in]: propertyIds } },
        attributes: ['id', 'title'],
      })
    : [];
  const titles = Object.fromEntries(props.map((p) => [p.id, p.title]));

  return {
    asOf: new Date().toISOString().slice(0, 10),
    occupancy,
    vacantSample: (vacant.units || []).slice(0, 10),
    byProperty: propertyIds.map((id) => ({
      propertyId: id,
      title: titles[id] || `Property #${id}`,
      ...propertyMap[id],
      occupancyRate:
        propertyMap[id].total > 0
          ? Number(((propertyMap[id].occupied / propertyMap[id].total) * 100).toFixed(1))
          : 0,
    })),
  };
}

module.exports = {
  getDailyLeasingBrief,
  getCollectionRiskBrief,
  getUpcomingExpiryBrief,
  getOccupancyBrief,
};
