'use strict';

const { Property, Unit, Tenant, Lease, Ticket, InvestmentAsset } = require('../../models');

const ENTITY_VALIDATORS = {
  property: async (companyId, id) => {
    const row = await Property.findOne({
      where: { id, companyId },
      attributes: ['id', 'title', 'location'],
    });
    return row
      ? { entityType: 'property', entityId: row.id, label: row.title, module: 'properties', meta: row.toJSON() }
      : null;
  },
  unit: async (companyId, id) => {
    const row = await Unit.findOne({
      where: { id, companyId },
      attributes: ['id', 'unitNumber', 'propertyId', 'status'],
    });
    return row
      ? {
          entityType: 'unit',
          entityId: row.id,
          label: `Unit ${row.unitNumber}`,
          module: 'units',
          meta: row.toJSON(),
        }
      : null;
  },
  tenant: async (companyId, id) => {
    const row = await Tenant.findOne({
      where: { id, companyId },
      attributes: ['id', 'name', 'email'],
    });
    return row
      ? { entityType: 'tenant', entityId: row.id, label: row.name, module: 'tenants', meta: row.toJSON() }
      : null;
  },
  lease: async (companyId, id) => {
    const row = await Lease.findOne({
      where: { id, companyId },
      attributes: ['id', 'leaseNumber', 'tenantId', 'unitId', 'status', 'endDate'],
    });
    return row
      ? {
          entityType: 'lease',
          entityId: row.id,
          label: row.leaseNumber,
          module: 'leases',
          meta: row.toJSON(),
        }
      : null;
  },
  ticket: async (companyId, id) => {
    // Tickets may not be company-scoped in model; still validate existence.
    const row = await Ticket.findByPk(id, {
      attributes: ['id', 'ticketNumber', 'title', 'status'],
    });
    return row
      ? {
          entityType: 'ticket',
          entityId: row.id,
          label: row.ticketNumber || `Ticket #${row.id}`,
          module: 'helpdesk',
          meta: row.toJSON(),
        }
      : null;
  },
  investment: async (companyId, id) => {
    const row = await InvestmentAsset.findOne({
      where: { id, companyId },
      attributes: ['id', 'investmentName', 'investmentCode', 'status'],
    });
    return row
      ? {
          entityType: 'investment',
          entityId: row.id,
          label: row.investmentName || row.investmentCode || `Investment #${row.id}`,
          module: 'investment',
          meta: row.toJSON(),
        }
      : null;
  },
};

/**
 * Server-validate entity context. Never trust client IDs without this check.
 */
async function resolveEntityContext(companyId, { entityType, entityId, moduleContext } = {}) {
  if (!entityType || entityId == null || entityId === '') {
    return {
      moduleContext: moduleContext || null,
      entityType: null,
      entityId: null,
      label: null,
      meta: null,
    };
  }

  const type = String(entityType).toLowerCase();
  const id = Number(entityId);
  if (!Number.isFinite(id) || id <= 0) {
    const err = new Error('Invalid entityId');
    err.status = 400;
    err.code = 'INVALID_ENTITY_CONTEXT';
    throw err;
  }

  const validator = ENTITY_VALIDATORS[type];
  if (!validator) {
    const err = new Error(`Unsupported entityType: ${entityType}`);
    err.status = 400;
    err.code = 'UNSUPPORTED_ENTITY_TYPE';
    throw err;
  }

  const resolved = await validator(companyId, id);
  if (!resolved) {
    const err = new Error('Entity not found in active company');
    err.status = 404;
    err.code = 'ENTITY_NOT_IN_COMPANY';
    throw err;
  }

  return {
    moduleContext: moduleContext || resolved.module,
    entityType: resolved.entityType,
    entityId: resolved.entityId,
    label: resolved.label,
    meta: resolved.meta,
  };
}

function buildContextPromptHint(ctx) {
  if (!ctx?.entityType || !ctx?.entityId) return '';
  return (
    `Active entity context (server-validated): ${ctx.entityType} #${ctx.entityId}` +
    (ctx.label ? ` (${ctx.label})` : '') +
    `. Prefer tools and documents related to this entity.`
  );
}

module.exports = {
  resolveEntityContext,
  buildContextPromptHint,
  ENTITY_VALIDATORS,
};
