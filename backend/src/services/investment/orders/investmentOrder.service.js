'use strict';

const {
  InvestmentOrder,
  InvestmentTrade,
  InvestmentInstrument,
  InvestmentPortfolio,
  InvestmentBroker,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const { canTransitionOrder } = require('./costBasis.service');
const { Op } = require('sequelize');

function userId(req) {
  return req.user?.id || req.userId || null;
}

async function nextOrderNumber(companyId) {
  const count = await InvestmentOrder.count({ where: { companyId } });
  return `ORD-${String(count + 1).padStart(6, '0')}`;
}

async function listOrders(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.side) where.side = String(req.query.side).toUpperCase();
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.instrumentId) where.instrumentId = Number(req.query.instrumentId);
  if (req.query.search) {
    where[Op.or] = [{ orderNumber: { [Op.like]: `%${req.query.search}%` } }];
  }
  const { count, rows } = await InvestmentOrder.findAndCountAll({
    where,
    include: [
      { model: InvestmentInstrument, as: 'instrument', attributes: ['id', 'instrumentCode', 'instrumentName'] },
      { model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] },
      { model: InvestmentBroker, as: 'broker', attributes: ['id', 'brokerName'] },
    ],
    order: [['orderDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { orders: rows, pagination: paginationMeta(count, page, limit) };
}

async function getOrder(req, id) {
  const order = await InvestmentOrder.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentInstrument, as: 'instrument' },
      { model: InvestmentPortfolio, as: 'portfolio' },
      { model: InvestmentBroker, as: 'broker' },
      { model: InvestmentTrade, as: 'trades' },
    ],
  });
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }
  return order;
}

async function createOrder(req, data) {
  if (!data.portfolioId || !data.instrumentId) {
    const err = new Error('portfolioId and instrumentId are required');
    err.statusCode = 400;
    throw err;
  }
  const side = String(data.side || '').toUpperCase();
  if (!['BUY', 'SELL'].includes(side)) {
    const err = new Error('side must be BUY or SELL');
    err.statusCode = 400;
    throw err;
  }
  const qty = Number(data.quantity);
  if (!(qty > 0)) {
    const err = new Error('quantity must be positive');
    err.statusCode = 400;
    throw err;
  }
  const orderNumber = data.orderNumber || (await nextOrderNumber(req.companyId));
  return InvestmentOrder.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId,
      instrumentId: data.instrumentId,
      orderNumber,
      orderType: data.orderType || 'MARKET',
      side,
      quantity: qty,
      executedQuantity: 0,
      limitPrice: data.limitPrice ?? null,
      stopPrice: data.stopPrice ?? null,
      currencyCode: data.currencyCode || 'AED',
      orderDate: data.orderDate || new Date().toISOString().slice(0, 10),
      expiryDate: data.expiryDate || null,
      brokerId: data.brokerId || null,
      accountId: data.accountId || null,
      settlementInstructions: data.settlementInstructions || null,
      status: data.status || 'DRAFT',
      remarks: data.remarks || null,
      isTestData: !!data.isTestData,
    })
  );
}

async function updateOrder(req, id, data) {
  const order = await getOrder(req, id);
  if (!['DRAFT', 'SUBMITTED'].includes(order.status)) {
    const err = new Error('Only DRAFT or SUBMITTED orders can be updated');
    err.statusCode = 400;
    throw err;
  }
  const fields = [
    'orderType', 'quantity', 'limitPrice', 'stopPrice', 'currencyCode',
    'orderDate', 'expiryDate', 'brokerId', 'accountId', 'settlementInstructions', 'remarks',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) order[f] = data[f];
  }
  if (data.side) order.side = String(data.side).toUpperCase();
  await order.save();
  return getOrder(req, id);
}

async function transitionOrder(req, id, toStatus, extra = {}) {
  const order = await InvestmentOrder.findOne({ where: { id, ...companyWhere(req) } });
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionOrder(order.status, toStatus)) {
    const err = new Error(`Cannot transition order from ${order.status} to ${toStatus}`);
    err.statusCode = 400;
    throw err;
  }
  order.status = toStatus;
  if (toStatus === 'SUBMITTED') order.submittedBy = userId(req);
  if (toStatus === 'APPROVED') order.approvedBy = userId(req);
  if (extra.remarks !== undefined) order.remarks = extra.remarks;
  await order.save();
  return getOrder(req, id);
}

async function submitOrder(req, id) {
  return transitionOrder(req, id, 'SUBMITTED');
}

async function approveOrder(req, id) {
  const order = await getOrder(req, id);
  const riskComplianceService = require('../risk/investmentRiskCompliance.service');
  await riskComplianceService.assertOrderPreTrade(req, order);
  return transitionOrder(req, id, 'APPROVED');
}

async function rejectOrder(req, id, reason) {
  return transitionOrder(req, id, 'REJECTED', { remarks: reason || null });
}

async function placeOrder(req, id) {
  return transitionOrder(req, id, 'PLACED');
}

async function cancelOrder(req, id, reason) {
  return transitionOrder(req, id, 'CANCELLED', { remarks: reason || null });
}

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  submitOrder,
  approveOrder,
  rejectOrder,
  placeOrder,
  cancelOrder,
  transitionOrder,
  nextOrderNumber,
};
