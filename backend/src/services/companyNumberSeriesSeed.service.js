const { CompanyNumberSeries } = require('../models');

const DOCUMENT_TYPES = [
  'invoice',
  'receipt',
  'payment',
  'journal_voucher',
  'purchase_order',
  'purchase_invoice',
  'vendor_invoice',
  'cheque',
  'lease',
  'property',
  'tenant',
  'budget',
  'legal',
  'helpdesk',
  'goods_receipt',
  'direct_purchase_invoice',
  'investment_asset',
  'investment_transaction',
  'investment_valuation',
  'investment_distribution',
];

const DEFAULT_PREFIX_BY_TYPE = {
  invoice: 'INV',
  receipt: 'REC',
  payment: 'PAY',
  journal_voucher: 'JV',
  purchase_order: 'PO',
  purchase_invoice: 'PI',
  vendor_invoice: 'VI',
  cheque: 'CHQ',
  lease: 'L',
  property: 'PRP',
  tenant: 'TNT',
  budget: 'BUD',
  legal: 'LEG',
  helpdesk: 'TKT',
  goods_receipt: 'GR',
  direct_purchase_invoice: 'DPI',
  investment_asset: 'INV',
  investment_transaction: 'ITX',
  investment_valuation: 'VAL',
  investment_distribution: 'IDT',
};

/**
 * Insert missing number series rows for a company (idempotent).
 * @param {number} companyId
 * @returns {Promise<{ created: number, total: number }>}
 */
async function seedMissingNumberSeries(companyId) {
  if (!companyId) {
    throw new Error('companyId is required');
  }

  const existing = await CompanyNumberSeries.findAll({
    where: { companyId },
    attributes: ['documentType'],
  });
  const have = new Set(existing.map((r) => r.documentType));
  let created = 0;

  for (const docType of DOCUMENT_TYPES) {
    if (have.has(docType)) continue;
    const prefix = DEFAULT_PREFIX_BY_TYPE[docType] || 'DOC';
    await CompanyNumberSeries.create({
      companyId,
      documentType: docType,
      prefix,
      suffix: null,
      currentNumber: 0,
      padding: 4,
      resetType: 'yearly',
      isActive: true,
    });
    created += 1;
  }

  return { created, total: DOCUMENT_TYPES.length };
}

module.exports = {
  DOCUMENT_TYPES,
  DEFAULT_PREFIX_BY_TYPE,
  seedMissingNumberSeries,
};
