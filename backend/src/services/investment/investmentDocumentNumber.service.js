const { generateDocumentNumber } = require('../companyDocumentNumber.service');

const DOC_TYPES = {
  asset: 'investment_asset',
  transaction: 'investment_transaction',
  valuation: 'investment_valuation',
  distribution: 'investment_distribution',
};

async function allocateInvestmentNumber(companyId, kind, transaction) {
  const documentType = DOC_TYPES[kind] || kind;
  const num = await generateDocumentNumber({ companyId, documentType, transaction });
  if (num) return num;
  const prefix = { asset: 'INV', transaction: 'ITX', valuation: 'VAL', distribution: 'IDT' }[kind] || 'INV';
  return `${prefix}-${Date.now()}`;
}

module.exports = { DOC_TYPES, allocateInvestmentNumber };
