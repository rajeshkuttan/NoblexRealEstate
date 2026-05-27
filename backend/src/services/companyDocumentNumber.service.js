const { CompanyNumberSeries } = require('../models');
const documentNumberingService = require('./documentNumberingService');

const LEGACY_NAME_TO_TYPE = {
  'Receipt Invoice': 'invoice',
  Receipt: 'receipt',
  'Payment Voucher': 'payment',
  'Journal Voucher': 'journal_voucher',
  'Purchase Order': 'purchase_order',
  'Purchase Invoice': 'purchase_invoice',
  Lease: 'lease',
  Legal: 'legal',
  Helpdesk: 'helpdesk',
  'Goods Receipt Note': 'goods_receipt',
};

function resolveDocumentType(documentTypeOrLegacyName) {
  return LEGACY_NAME_TO_TYPE[documentTypeOrLegacyName] || documentTypeOrLegacyName;
}

function resetKeyForType(resetType, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  if (resetType === 'daily') return `${y}-${m}-${d}`;
  if (resetType === 'monthly') return `${y}-${m}`;
  if (resetType === 'yearly') return `${y}`;
  return null;
}

function formatNumber(series, serial) {
  const pad = series.padding || 4;
  let serialStr = String(serial).padStart(pad, '0');
  let out = '';
  if (series.prefix) out += `${series.prefix}-`;
  if (series.resetType === 'yearly') out += `${new Date().getFullYear()}-`;
  out += serialStr;
  if (series.suffix) out += `-${series.suffix}`;
  return out;
}

async function getActiveSeries(companyId, documentType, transaction) {
  return CompanyNumberSeries.findOne({
    where: { companyId, documentType, isActive: true },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
}

async function previewDocumentNumber(companyId, documentTypeOrLegacyName) {
  const documentType = resolveDocumentType(documentTypeOrLegacyName);
  const series = await CompanyNumberSeries.findOne({
    where: { companyId, documentType, isActive: true },
  });
  if (!series) return null;
  return formatNumber(series, (series.currentNumber || 0) + 1);
}

/**
 * @param {{ companyId: number, documentType: string, transaction: object }} params
 */
async function generateDocumentNumber({ companyId, documentType: rawType, transaction }) {
  if (!transaction) {
    throw new Error('Transaction is required for company document number generation');
  }
  if (!companyId) {
    throw new Error('companyId is required for company document number generation');
  }

  const documentType = resolveDocumentType(rawType);
  let series = await getActiveSeries(companyId, documentType, transaction);

  if (!series) {
    const legacyName = Object.entries(LEGACY_NAME_TO_TYPE).find(([, v]) => v === documentType)?.[0];
    if (legacyName) {
      const legacy = await documentNumberingService.generateDocumentNumber(legacyName, transaction);
      if (legacy) return legacy;
    }
    return null;
  }

  const resetKey = resetKeyForType(series.resetType);
  let current = series.currentNumber || 0;
  if (resetKey && series.lastResetKey !== resetKey) {
    current = 0;
    series.lastResetKey = resetKey;
  }

  current += 1;
  series.currentNumber = current;
  await series.save({ transaction });
  return formatNumber(series, current);
}

module.exports = {
  resolveDocumentType,
  previewDocumentNumber,
  generateDocumentNumber,
  LEGACY_NAME_TO_TYPE,
};
