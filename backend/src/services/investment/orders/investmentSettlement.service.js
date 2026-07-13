'use strict';

const {
  InvestmentSettlement,
  InvestmentTrade,
  InvestmentInstrument,
  InvestmentPortfolio,
} = require('../../../models');
const { companyWhere } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const { canTransitionSettlement } = require('./costBasis.service');
const { Op } = require('sequelize');

async function listSettlements(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.tradeId) where.tradeId = Number(req.query.tradeId);
  if (req.query.search) {
    where[Op.or] = [
      { settlementNumber: { [Op.like]: `%${req.query.search}%` } },
      { externalReference: { [Op.like]: `%${req.query.search}%` } },
    ];
  }
  const { count, rows } = await InvestmentSettlement.findAndCountAll({
    where,
    include: [
      {
        model: InvestmentTrade,
        as: 'trade',
        include: [
          { model: InvestmentInstrument, as: 'instrument', attributes: ['id', 'instrumentCode', 'instrumentName'] },
          { model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] },
        ],
      },
    ],
    order: [['expectedDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { settlements: rows, pagination: paginationMeta(count, page, limit) };
}

async function getSettlement(req, id) {
  const settlement = await InvestmentSettlement.findOne({
    where: { id, ...companyWhere(req) },
    include: [{ model: InvestmentTrade, as: 'trade' }],
  });
  if (!settlement) {
    const err = new Error('Settlement not found');
    err.statusCode = 404;
    throw err;
  }
  return settlement;
}

async function transitionSettlement(req, id, toStatus, extra = {}) {
  const settlement = await InvestmentSettlement.findOne({
    where: { id, ...companyWhere(req) },
  });
  if (!settlement) {
    const err = new Error('Settlement not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionSettlement(settlement.status, toStatus)) {
    const err = new Error(`Cannot transition settlement from ${settlement.status} to ${toStatus}`);
    err.statusCode = 400;
    throw err;
  }
  settlement.status = toStatus;
  if (toStatus === 'SETTLED') {
    settlement.actualDate = extra.actualDate || new Date().toISOString().slice(0, 10);
    settlement.reconciledAt = extra.reconciledAt || new Date();
  }
  if (toStatus === 'FAILED') {
    settlement.failureReason = extra.failureReason || extra.reason || 'Settlement failed';
  }
  if (extra.externalReference !== undefined) {
    settlement.externalReference = extra.externalReference;
  }
  if (extra.bankAccountId !== undefined) {
    settlement.bankAccountId = extra.bankAccountId;
  }
  await settlement.save();

  if (['SETTLED', 'FAILED'].includes(toStatus)) {
    const trade = await InvestmentTrade.findOne({
      where: { id: settlement.tradeId, ...companyWhere(req) },
    });
    if (trade) {
      if (toStatus === 'SETTLED') trade.status = 'SETTLED';
      if (toStatus === 'FAILED') trade.status = 'FAILED';
      await trade.save();
    }
  }

  return getSettlement(req, id);
}

async function settleSettlement(req, id, data = {}) {
  return transitionSettlement(req, id, 'SETTLED', data);
}

async function failSettlement(req, id, data = {}) {
  return transitionSettlement(req, id, 'FAILED', data);
}

async function cancelSettlement(req, id, data = {}) {
  return transitionSettlement(req, id, 'CANCELLED', data);
}

module.exports = {
  listSettlements,
  getSettlement,
  settleSettlement,
  failSettlement,
  cancelSettlement,
  transitionSettlement,
};
