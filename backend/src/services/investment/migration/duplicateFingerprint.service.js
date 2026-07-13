'use strict';

/**
 * Duplicate fingerprint for legacy ↔ OMS coexistence (Investment 2.0 RC1).
 * Same-origin duplicates block; OMS vs LEGACY do not block each other.
 */

const crypto = require('crypto');
const { Op } = require('sequelize');

function normalizePart(value) {
  if (value == null || value === '') return '';
  return String(value).trim().toUpperCase();
}

function roundQty(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0.000000';
  return x.toFixed(6);
}

function roundAmt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0.00';
  return x.toFixed(2);
}

/**
 * @param {{
 *   companyId: number,
 *   instrumentOrAssetKey: number|string,
 *   transactionType: string,
 *   tradeDate: string,
 *   quantity?: number,
 *   amount?: number,
 *   brokerReference?: string|null,
 *   externalReference?: string|null,
 * }} fields
 */
function buildFingerprint(fields = {}) {
  const companyId = Number(fields.companyId);
  const instrumentOrAssetKey = fields.instrumentOrAssetKey;
  const transactionType = normalizePart(fields.transactionType);
  const tradeDate = String(fields.tradeDate || '').slice(0, 10);
  const quantity = Number(fields.quantity || 0);
  const amount = Number(fields.amount || 0);
  const brokerReference = fields.brokerReference || null;
  const externalReference = fields.externalReference || null;

  const raw = [
    normalizePart(companyId),
    normalizePart(instrumentOrAssetKey),
    transactionType,
    tradeDate,
    roundQty(quantity),
    roundAmt(amount),
    normalizePart(brokerReference),
    normalizePart(externalReference),
  ].join('|');

  const hash = crypto.createHash('sha256').update(raw).digest('hex');

  return {
    hash,
    raw,
    companyId,
    instrumentOrAssetKey,
    transactionType,
    tradeDate,
    quantity,
    amount,
    brokerReference,
    externalReference,
  };
}

function qtyClose(a, b, tol = 0.000001) {
  return Math.abs(Number(a || 0) - Number(b || 0)) <= tol;
}

function amtClose(a, b, tol = 0.01) {
  return Math.abs(Number(a || 0) - Number(b || 0)) <= tol;
}

function refsMatch(fp, row) {
  const fpBroker = normalizePart(fp.brokerReference);
  const fpExt = normalizePart(fp.externalReference);
  const rowBroker = normalizePart(row.brokerReference);
  const rowExt = normalizePart(row.externalReference);

  // If fingerprint carries a ref, require equality; empty refs match empty or anything weak.
  if (fpBroker && fpBroker !== rowBroker) return false;
  if (fpExt && fpExt !== rowExt) return false;
  if (!fpBroker && !fpExt) {
    // Both sides empty on refs: ok. If row has refs but fp does not, still allow core-field match.
    return true;
  }
  return true;
}

/**
 * Search InvestmentTransaction for a fingerprint match.
 * @param {object} models - sequelize models bag (must include InvestmentTransaction when available)
 * @param {object} fingerprint - from buildFingerprint
 * @param {{ excludeId?: number }} [opts]
 */
async function findLegacyDuplicate(models, fingerprint, opts = {}) {
  const InvestmentTransaction = models && models.InvestmentTransaction;
  if (!InvestmentTransaction || !fingerprint) return null;

  const where = {
    companyId: fingerprint.companyId,
    transactionType: fingerprint.transactionType || { [Op.ne]: null },
    transactionDate: fingerprint.tradeDate,
  };

  if (fingerprint.instrumentOrAssetKey != null && fingerprint.instrumentOrAssetKey !== '') {
    where.investmentAssetId = fingerprint.instrumentOrAssetKey;
  }

  if (opts.excludeId != null) {
    where.id = { [Op.ne]: opts.excludeId };
  }

  const candidates = await InvestmentTransaction.findAll({
    where,
    limit: 50,
    order: [['id', 'ASC']],
  });

  for (const row of candidates) {
    const rowAmt = Number(row.netAmount ?? row.grossAmount ?? row.baseAmount ?? 0);
    if (!qtyClose(row.quantity, fingerprint.quantity)) continue;
    if (!amtClose(rowAmt, fingerprint.amount)) continue;
    if (!refsMatch(fingerprint, row)) continue;
    return row;
  }

  return null;
}

function originsCoexist(checkingOrigin, matchOrigin) {
  const a = String(checkingOrigin || 'LEGACY').toUpperCase();
  const b = String(matchOrigin || 'LEGACY').toUpperCase();
  // OMS must not block LEGACY dual-entry and vice versa
  if ((a === 'OMS' && b === 'LEGACY') || (a === 'LEGACY' && b === 'OMS')) {
    return true;
  }
  return false;
}

/**
 * Throws Error with code DUPLICATE_INVESTMENT_ENTRY when a same-origin duplicate exists.
 * Cross-origin OMS ↔ LEGACY matches are allowed during coexistence.
 *
 * @param {object} models
 * @param {object} payload - fingerprint fields + optional transactionOrigin, excludeId/id
 */
async function assertNoDuplicate(models, payload = {}) {
  const fingerprint = buildFingerprint(payload);
  const match = await findLegacyDuplicate(models, fingerprint, {
    excludeId: payload.excludeId != null ? payload.excludeId : payload.id,
  });

  if (!match) return null;

  const checkingOrigin = payload.transactionOrigin || 'LEGACY';
  const matchOrigin = match.transactionOrigin || 'LEGACY';

  if (originsCoexist(checkingOrigin, matchOrigin)) {
    return null;
  }

  const err = new Error(
    `Duplicate investment entry (fingerprint ${fingerprint.hash.slice(0, 12)}… matches txn #${match.id})`
  );
  err.code = 'DUPLICATE_INVESTMENT_ENTRY';
  err.statusCode = 409;
  err.duplicateId = match.id;
  err.fingerprint = fingerprint.hash;
  throw err;
}

module.exports = {
  buildFingerprint,
  findLegacyDuplicate,
  assertNoDuplicate,
  originsCoexist,
};
