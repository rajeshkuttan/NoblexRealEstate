'use strict';

const { Op } = require('sequelize');
const {
  InvestmentInstrument,
  InvestmentInstrumentAttribute,
  InvestmentHoldingV2,
  InvestmentAsset,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');

/** Asset-type behaviour hints for UI/validation (Phase 17.4) */
const ASSET_TYPE_RULES = {
  EQUITY: { requiresTicker: true, supportsDividends: true, supportsSplits: true },
  FIXED_INCOME: { requiresMaturity: true, supportsCoupon: true, supportsInterest: true },
  SUKUK: { requiresMaturity: true, supportsCoupon: true, supportsInterest: true },
  FIXED_DEPOSIT: { requiresMaturity: true, supportsInterest: true },
  GOLD: { unit: 'oz', supportsRevaluation: true },
  SILVER: { unit: 'oz', supportsRevaluation: true },
  FUND: { supportsNAV: true, supportsDividends: true },
  PRIVATE_EQUITY: { supportsCapitalCalls: true, illiquid: true },
  REAL_ESTATE_FUND: { supportsNAV: true, illiquid: true },
};

function rulesForType(instrumentType, assetClass) {
  const key = String(instrumentType || assetClass || '')
    .toUpperCase()
    .replace(/\s+/g, '_');
  return ASSET_TYPE_RULES[key] || ASSET_TYPE_RULES.EQUITY;
}

async function listInstruments(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.assetClass) where.assetClass = req.query.assetClass;
  if (req.query.search) {
    where[Op.or] = [
      { instrumentName: { [Op.like]: `%${req.query.search}%` } },
      { instrumentCode: { [Op.like]: `%${req.query.search}%` } },
      { isin: { [Op.like]: `%${req.query.search}%` } },
      { ticker: { [Op.like]: `%${req.query.search}%` } },
    ];
  }
  const { count, rows } = await InvestmentInstrument.findAndCountAll({
    where,
    order: [['instrumentName', 'ASC']],
    limit,
    offset,
  });
  return { instruments: rows, pagination: paginationMeta(count, page, limit) };
}

async function getInstrument360(req, instrumentId) {
  const instrument = await InvestmentInstrument.findOne({
    where: { id: instrumentId, ...companyWhere(req) },
    include: [
      { model: InvestmentInstrumentAttribute, as: 'attributes' },
      { model: InvestmentAsset, as: 'legacyAsset', attributes: ['id', 'investmentCode', 'investmentName', 'status'] },
    ],
  });
  if (!instrument) {
    const err = new Error('Instrument not found');
    err.statusCode = 404;
    throw err;
  }
  const holdings = await InvestmentHoldingV2.findAll({
    where: { instrumentId, ...companyWhere(req) },
  });
  return {
    instrument,
    behaviour: rulesForType(instrument.instrumentType, instrument.assetClass),
    holdings,
  };
}

async function createInstrument(req, data) {
  const code = data.instrumentCode || `INS-${Date.now().toString().slice(-6)}`;
  const instrument = await InvestmentInstrument.create(
    withCompanyId(req, {
      instrumentCode: code,
      instrumentName: data.instrumentName,
      shortName: data.shortName || null,
      assetClass: data.assetClass || data.assetType || null,
      instrumentType: data.instrumentType || null,
      isin: data.isin || data.isinCode || null,
      ticker: data.ticker || data.tickerSymbol || null,
      exchange: data.exchange || data.marketName || null,
      issuerName: data.issuerName || null,
      countryCode: data.countryCode || null,
      sectorCode: data.sectorCode || null,
      currencyCode: data.currencyCode || 'AED',
      faceValue: data.faceValue || null,
      couponRate: data.couponRate || null,
      maturityDate: data.maturityDate || null,
      status: data.status || 'ACTIVE',
      legacyAssetId: data.legacyAssetId || null,
      isTestData: !!data.isTestData,
    })
  );
  if (data.attributes && typeof data.attributes === 'object') {
    const entries = Object.entries(data.attributes);
    for (const [attrKey, attrValue] of entries) {
      // eslint-disable-next-line no-await-in-loop
      await InvestmentInstrumentAttribute.create(
        withCompanyId(req, {
          instrumentId: instrument.id,
          attrKey,
          attrValue: attrValue == null ? null : String(attrValue),
        })
      );
    }
  }
  return getInstrument360(req, instrument.id);
}

async function updateInstrument(req, instrumentId, data) {
  const instrument = await InvestmentInstrument.findOne({
    where: { id: instrumentId, ...companyWhere(req) },
  });
  if (!instrument) {
    const err = new Error('Instrument not found');
    err.statusCode = 404;
    throw err;
  }
  const allowed = [
    'instrumentName',
    'shortName',
    'assetClass',
    'instrumentType',
    'isin',
    'ticker',
    'exchange',
    'issuerName',
    'countryCode',
    'sectorCode',
    'currencyCode',
    'faceValue',
    'couponRate',
    'maturityDate',
    'status',
    'isTestData',
  ];
  const updates = {};
  for (const k of allowed) {
    if (data[k] !== undefined) updates[k] = data[k];
  }
  await instrument.update(updates);
  return getInstrument360(req, instrumentId);
}

module.exports = {
  ASSET_TYPE_RULES,
  rulesForType,
  listInstruments,
  getInstrument360,
  createInstrument,
  updateInstrument,
};
