'use strict';

const { Op } = require('sequelize');
const { Property, Unit, Tenant, Lease } = require('../../../models');

const MAX_ROWS = 25;

async function getPropertyPortfolioSummary({ companyId }) {
  const properties = await Property.findAll({
    where: { companyId },
    attributes: ['id', 'title', 'location', 'emirate', 'availability', 'type', 'category'],
    limit: MAX_ROWS,
    order: [['id', 'ASC']],
  });
  const units = await Unit.findAll({
    where: { companyId },
    attributes: ['id', 'status'],
  });
  const byStatus = {};
  for (const u of units) {
    byStatus[u.status] = (byStatus[u.status] || 0) + 1;
  }
  return {
    propertyCount: properties.length,
    unitCount: units.length,
    unitsByStatus: byStatus,
    properties: properties.map((p) => ({
      id: p.id,
      title: p.title,
      location: p.location,
      emirate: p.emirate,
      availability: p.availability,
      type: p.type,
    })),
  };
}

async function getPropertyDetails({ companyId, propertyId, search }) {
  const where = { companyId };
  if (propertyId) where.id = propertyId;
  if (search) {
    where[Op.or] = [
      { title: { [Op.like]: `%${search}%` } },
      { location: { [Op.like]: `%${search}%` } },
      { plotNumber: { [Op.like]: `%${search}%` } },
    ];
  }
  const rows = await Property.findAll({
    where,
    attributes: [
      'id',
      'title',
      'plotNumber',
      'location',
      'emirate',
      'community',
      'availability',
      'type',
      'category',
      'area',
    ],
    limit: propertyId ? 1 : MAX_ROWS,
  });
  return rows.map((p) => p.toJSON());
}

async function getUnitDetails({ companyId, unitId, search }) {
  const where = { companyId };
  if (unitId) where.id = unitId;
  if (search) where.unitNumber = { [Op.like]: `%${search}%` };
  const rows = await Unit.findAll({
    where,
    attributes: [
      'id',
      'unitNumber',
      'propertyId',
      'status',
      'type',
      'bedrooms',
      'bathrooms',
      'area',
      'rentAmount',
    ],
    limit: unitId ? 1 : MAX_ROWS,
  });
  return rows.map((u) => u.toJSON());
}

async function getVacantUnits({ companyId, propertyId }) {
  const where = { companyId, status: 'available' };
  if (propertyId) where.propertyId = propertyId;
  const rows = await Unit.findAll({
    where,
    attributes: ['id', 'unitNumber', 'propertyId', 'type', 'bedrooms', 'rentAmount', 'status'],
    limit: MAX_ROWS,
    order: [['propertyId', 'ASC'], ['unitNumber', 'ASC']],
  });
  return { count: rows.length, units: rows.map((u) => u.toJSON()) };
}

async function getOccupancySummary({ companyId }) {
  const units = await Unit.findAll({
    where: { companyId },
    attributes: ['status'],
  });
  const summary = { total: units.length, available: 0, occupied: 0, other: 0 };
  for (const u of units) {
    if (u.status === 'available') summary.available += 1;
    else if (u.status === 'occupied') summary.occupied += 1;
    else summary.other += 1;
  }
  summary.occupancyRate =
    summary.total > 0 ? Number(((summary.occupied / summary.total) * 100).toFixed(1)) : 0;
  return summary;
}

async function getTenantProfile({ companyId, tenantId, search }) {
  const where = { companyId };
  if (tenantId) where.id = tenantId;
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phone: { [Op.like]: `%${search}%` } },
    ];
  }
  const rows = await Tenant.findAll({
    where,
    attributes: ['id', 'name', 'email', 'phone', 'status', 'nationality'],
    limit: tenantId ? 1 : MAX_ROWS,
  });
  return rows.map((t) => t.toJSON());
}

async function getLeaseDetails({ companyId, leaseId, search }) {
  const where = { companyId };
  if (leaseId) where.id = leaseId;
  if (search) where.leaseNumber = { [Op.like]: `%${search}%` };
  const rows = await Lease.findAll({
    where,
    attributes: [
      'id',
      'leaseNumber',
      'tenantId',
      'unitId',
      'startDate',
      'endDate',
      'rentAmount',
      'depositAmount',
      'status',
      'paymentFrequency',
    ],
    limit: leaseId ? 1 : MAX_ROWS,
  });
  return rows.map((l) => l.toJSON());
}

async function getExpiringLeases({ companyId, days = 90 }) {
  const windowDays = Math.min(Math.max(Number(days) || 90, 1), 365);
  const today = new Date();
  const until = new Date();
  until.setDate(until.getDate() + windowDays);
  const rows = await Lease.findAll({
    where: {
      companyId,
      status: 'active',
      endDate: {
        [Op.between]: [
          today.toISOString().slice(0, 10),
          until.toISOString().slice(0, 10),
        ],
      },
    },
    attributes: [
      'id',
      'leaseNumber',
      'tenantId',
      'unitId',
      'startDate',
      'endDate',
      'rentAmount',
      'status',
    ],
    limit: MAX_ROWS,
    order: [['endDate', 'ASC']],
  });
  return { days: windowDays, count: rows.length, leases: rows.map((l) => l.toJSON()) };
}

async function getLeaseStatsSummary({ companyId }) {
  const leases = await Lease.findAll({
    where: { companyId },
    attributes: ['status'],
  });
  const byStatus = {};
  for (const l of leases) {
    byStatus[l.status] = (byStatus[l.status] || 0) + 1;
  }
  return { total: leases.length, byStatus };
}

module.exports = {
  getPropertyPortfolioSummary,
  getPropertyDetails,
  getUnitDetails,
  getVacantUnits,
  getOccupancySummary,
  getTenantProfile,
  getLeaseDetails,
  getExpiringLeases,
  getLeaseStatsSummary,
};
