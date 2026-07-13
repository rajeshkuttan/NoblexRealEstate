'use strict';

const {
  sequelize,
  InvestmentOrder,
  InvestmentTrade,
  InvestmentSettlement,
  InvestmentTradeLotAllocation,
  InvestmentHoldingV2,
  InvestmentPositionLot,
  InvestmentPortfolio,
  InvestmentBook,
  InvestmentInstrument,
  InvestmentBroker,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const {
  allocateSellLots,
  computeRealizedGainLoss,
  applyFeeAllocation,
  computeBuyLot,
  computeTradeAmounts,
  nextOrderStatus,
  availableLotQuantity,
  round2,
  previewJournal,
} = require('./costBasis.service');
const { Op } = require('sequelize');

async function nextTradeNumber(companyId) {
  const count = await InvestmentTrade.count({ where: { companyId } });
  return `TRD-${String(count + 1).padStart(6, '0')}`;
}

async function nextSettlementNumber(companyId) {
  const count = await InvestmentSettlement.count({ where: { companyId } });
  return `STL-${String(count + 1).padStart(6, '0')}`;
}

async function findOrCreateHolding(req, { portfolioId, instrumentId, transaction }) {
  let holding = await InvestmentHoldingV2.findOne({
    where: { portfolioId, instrumentId, ...companyWhere(req) },
    transaction,
  });
  if (holding) return holding;

  const book =
    (await InvestmentBook.findOne({
      where: { portfolioId, ...companyWhere(req), status: 'ACTIVE' },
      order: [['id', 'ASC']],
      transaction,
    })) ||
    (await InvestmentBook.create(
      withCompanyId(req, {
        portfolioId,
        bookCode: 'MAIN',
        bookName: 'Main Book',
        bookType: 'TRADING',
        accountingBasis: 'COST',
        reportingCurrency: 'AED',
        status: 'ACTIVE',
      }),
      { transaction }
    ));

  holding = await InvestmentHoldingV2.create(
    withCompanyId(req, {
      portfolioId,
      bookId: book.id,
      instrumentId,
      quantity: 0,
      averageCost: 0,
      totalCost: 0,
      currentPrice: 0,
      currentMarketValue: 0,
      baseCurrencyValue: 0,
      unrealizedGainLoss: 0,
      realizedGainLoss: 0,
    }),
    { transaction }
  );
  return holding;
}

async function getOpenLots(holdingV2Id, req, transaction) {
  return InvestmentPositionLot.findAll({
    where: {
      holdingV2Id,
      status: 'OPEN',
      ...companyWhere(req),
      remainingQuantity: { [Op.gt]: 0 },
    },
    order: [['openDate', 'ASC'], ['id', 'ASC']],
    transaction,
  });
}

async function previewTrade(req, data) {
  const side = String(data.side || '').toUpperCase();
  const qty = Number(data.quantity);
  const price = Number(data.price);
  if (!data.portfolioId || !data.instrumentId || !['BUY', 'SELL'].includes(side) || !(qty > 0)) {
    const err = new Error('portfolioId, instrumentId, side, and positive quantity required');
    err.statusCode = 400;
    throw err;
  }

  const charges =
    Number(data.commission || 0) +
    Number(data.fees || 0) +
    Number(data.taxes || 0) +
    Number(data.withholdingTax || 0);
  const amounts = computeTradeAmounts({
    side,
    quantity: qty,
    price,
    commission: data.commission,
    fees: data.fees,
    taxes: data.taxes,
    withholdingTax: data.withholdingTax,
    accruedInterest: data.accruedInterest,
    exchangeRate: data.exchangeRate,
  });

  let holdingImpact = { quantityBefore: 0, quantityAfter: qty, availableQuantity: 0 };
  let lotImpact = [];
  let realizedGainLoss = 0;
  let costBasis = 0;

  const holding = await InvestmentHoldingV2.findOne({
    where: {
      portfolioId: data.portfolioId,
      instrumentId: data.instrumentId,
      ...companyWhere(req),
    },
  });
  const qtyBefore = holding ? Number(holding.quantity) : 0;
  holdingImpact.quantityBefore = qtyBefore;

  const portfolio = await InvestmentPortfolio.findOne({
    where: { id: data.portfolioId, ...companyWhere(req) },
  });
  const method = String(data.costBasisMethod || portfolio?.costBasisMethod || 'AVERAGE').toUpperCase();
  const accountingPolicy =
    data.accountingPolicy ||
    (portfolio?.accountingMethod === 'SETTLEMENT' ? 'SETTLEMENT_DATE' : 'TRADE_DATE');

  if (side === 'SELL') {
    const lots = holding ? await getOpenLots(holding.id, req) : [];
    const available = availableLotQuantity(lots);
    holdingImpact.availableQuantity = available;
    if (qty > available + 1e-9) {
      return {
        valid: false,
        error: `Oversell: available ${available}, requested ${qty}`,
        amounts,
        holdingImpact,
        lotImpact: [],
        realizedGainLoss: 0,
        journalPreview: null,
      };
    }
    const allocations = allocateSellLots(lots, qty, method, data.lotSelections || []);
    const withFees = applyFeeAllocation(allocations, charges);
    const gl = computeRealizedGainLoss(withFees, price, qty, charges);
    realizedGainLoss = gl.realizedGainLoss;
    costBasis = gl.costBasis;
    lotImpact = withFees.map((a) => ({
      lotId: a.lotId,
      quantity: a.quantity,
      unitCost: a.unitCost,
      cost: a.cost,
      feeShare: a.feeShare,
      realizedGainLoss: round2(a.quantity * price - a.cost - (a.feeShare || 0)),
    }));
    holdingImpact.quantityAfter = round2(qtyBefore - qty);
  } else {
    const buy = computeBuyLot(qty, price, charges);
    lotImpact = [{ action: 'OPEN', quantity: buy.quantity, unitCost: buy.unitCost, totalCost: buy.totalCost }];
    holdingImpact.quantityAfter = round2(qtyBefore + qty);
    holdingImpact.availableQuantity = qtyBefore;
  }

  const journalPreview = previewJournal(
    { side, realizedGainLoss, costBasis },
    amounts,
    data.accountingPolicy || 'TRADE_DATE'
  );

  return {
    valid: true,
    amounts,
    holdingImpact,
    lotImpact,
    realizedGainLoss,
    costBasis,
    costBasisMethod: method,
    accountingPolicy: data.accountingPolicy || 'TRADE_DATE',
    journalPreview,
  };
}

async function listTrades(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.side) where.side = String(req.query.side).toUpperCase();
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.orderId) where.orderId = Number(req.query.orderId);
  if (req.query.search) {
    where[Op.or] = [
      { tradeNumber: { [Op.like]: `%${req.query.search}%` } },
      { brokerReference: { [Op.like]: `%${req.query.search}%` } },
    ];
  }
  const { count, rows } = await InvestmentTrade.findAndCountAll({
    where,
    include: [
      { model: InvestmentInstrument, as: 'instrument', attributes: ['id', 'instrumentCode', 'instrumentName'] },
      { model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] },
      { model: InvestmentOrder, as: 'order', attributes: ['id', 'orderNumber', 'status'] },
    ],
    order: [['tradeDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { trades: rows, pagination: paginationMeta(count, page, limit) };
}

async function getTrade(req, id, options = {}) {
  const trade = await InvestmentTrade.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentInstrument, as: 'instrument' },
      { model: InvestmentPortfolio, as: 'portfolio' },
      { model: InvestmentOrder, as: 'order' },
      { model: InvestmentBroker, as: 'broker' },
      { model: InvestmentSettlement, as: 'settlements' },
      { model: InvestmentTradeLotAllocation, as: 'lotAllocations' },
    ],
    transaction: options.transaction,
  });
  if (!trade) {
    const err = new Error('Trade not found');
    err.statusCode = 404;
    throw err;
  }
  return trade;
}

async function createTrade(req, data) {
  const preview = await previewTrade(req, data);
  if (!preview.valid) {
    const err = new Error(preview.error || 'Trade preview failed');
    err.statusCode = 400;
    throw err;
  }

  const side = String(data.side).toUpperCase();
  const qty = Number(data.quantity);
  const price = Number(data.price);
  const amounts = preview.amounts;
  const tradeNumber = data.tradeNumber || (await nextTradeNumber(req.companyId));

  return sequelize.transaction(async (transaction) => {
    let order = null;
    if (data.orderId) {
      order = await InvestmentOrder.findOne({
        where: { id: data.orderId, ...companyWhere(req) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }
      if (!['PLACED', 'PARTIALLY_EXECUTED', 'APPROVED'].includes(order.status)) {
        const err = new Error(`Order status ${order.status} cannot be executed`);
        err.statusCode = 400;
        throw err;
      }
      const remaining = Number(order.quantity) - Number(order.executedQuantity);
      if (qty > remaining + 1e-9) {
        const err = new Error(`Execution quantity ${qty} exceeds remaining ${remaining}`);
        err.statusCode = 400;
        throw err;
      }
    }

    const holding = await findOrCreateHolding(req, {
      portfolioId: data.portfolioId,
      instrumentId: data.instrumentId,
      transaction,
    });

    const trade = await InvestmentTrade.create(
      withCompanyId(req, {
        portfolioId: data.portfolioId,
        orderId: data.orderId || null,
        instrumentId: data.instrumentId,
        holdingV2Id: holding.id,
        tradeNumber,
        brokerReference: data.brokerReference || null,
        side,
        tradeDate: data.tradeDate || new Date().toISOString().slice(0, 10),
        settlementDate: data.settlementDate || null,
        quantity: qty,
        price,
        grossAmount: amounts.grossAmount,
        accruedInterest: amounts.accruedInterest,
        commission: Number(data.commission || 0),
        fees: Number(data.fees || 0),
        taxes: Number(data.taxes || 0),
        withholdingTax: Number(data.withholdingTax || 0),
        exchangeRate: amounts.exchangeRate,
        netSettlement: amounts.netSettlement,
        realizedGainLoss: preview.realizedGainLoss || 0,
        costBasisMethod: preview.costBasisMethod || 'AVERAGE',
        brokerId: data.brokerId || null,
        custodianId: data.custodianId || null,
        investmentAccountId: data.investmentAccountId || null,
        bankAccountId: data.bankAccountId || null,
        accountingPolicy: data.accountingPolicy || 'TRADE_DATE',
        status: data.status || 'DRAFT',
        remarks: data.remarks || null,
        isTestData: !!data.isTestData,
      }),
      { transaction }
    );

    if (order) {
      const newExec = round2(Number(order.executedQuantity) + qty);
      order.executedQuantity = newExec;
      const st = nextOrderStatus(order.quantity, newExec);
      if (st) order.status = st;
      else if (order.status === 'APPROVED') order.status = 'PLACED';
      await order.save({ transaction });
    }

    if (data.confirm === true || data.status === 'CONFIRMED') {
      await applyTradeToHoldings(req, trade, preview, { transaction, confirm: true });
    }

    return getTrade(req, trade.id, { transaction });
  });
}

async function applyTradeToHoldings(req, trade, preview, { transaction, confirm }) {
  const side = String(trade.side).toUpperCase();
  const qty = Number(trade.quantity);
  const price = Number(trade.price);
  const charges =
    Number(trade.commission || 0) +
    Number(trade.fees || 0) +
    Number(trade.taxes || 0) +
    Number(trade.withholdingTax || 0);

  const holding = await InvestmentHoldingV2.findOne({
    where: { id: trade.holdingV2Id, ...companyWhere(req) },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!holding) {
    const err = new Error('Holding not found');
    err.statusCode = 404;
    throw err;
  }

  if (side === 'BUY') {
    const buy = computeBuyLot(qty, price, charges);
    await InvestmentPositionLot.create(
      withCompanyId(req, {
        holdingV2Id: holding.id,
        lotRef: `${trade.tradeNumber}-L1`,
        openDate: trade.tradeDate,
        quantity: buy.quantity,
        remainingQuantity: buy.quantity,
        unitCost: buy.unitCost,
        totalCost: buy.totalCost,
        status: 'OPEN',
      }),
      { transaction }
    );
    const newQty = round2(Number(holding.quantity) + qty);
    const newCost = round2(Number(holding.totalCost) + buy.totalCost);
    holding.quantity = newQty;
    holding.totalCost = newCost;
    holding.averageCost = newQty > 0 ? round2(newCost / newQty) : 0;
    holding.currentPrice = price;
    holding.currentMarketValue = round2(newQty * price);
    holding.unrealizedGainLoss = round2(Number(holding.currentMarketValue) - newCost);
    await holding.save({ transaction });
  } else {
    const lots = await getOpenLots(holding.id, req, transaction);
    const method = trade.costBasisMethod || 'AVERAGE';
    const allocations = allocateSellLots(lots, qty, method, preview?.lotSelections || []);
    const withFees = applyFeeAllocation(allocations, charges);
    const gl = computeRealizedGainLoss(withFees, price, qty, charges);

    for (const a of withFees) {
      const lot = lots.find((l) => Number(l.id) === Number(a.lotId));
      if (!lot) continue;
      const rem = round2(Number(lot.remainingQuantity) - Number(a.quantity));
      lot.remainingQuantity = rem;
      lot.totalCost = round2(rem * Number(lot.unitCost));
      if (rem <= 1e-9) {
        lot.remainingQuantity = 0;
        lot.totalCost = 0;
        lot.status = 'CLOSED';
      }
      await lot.save({ transaction });
      await InvestmentTradeLotAllocation.create(
        withCompanyId(req, {
          tradeId: trade.id,
          lotId: lot.id,
          quantity: a.quantity,
          unitCost: a.unitCost,
          realizedGainLoss: round2(a.quantity * price - a.cost - (a.feeShare || 0)),
        }),
        { transaction }
      );
    }

    trade.realizedGainLoss = gl.realizedGainLoss;
    await trade.save({ transaction });

    const newQty = round2(Number(holding.quantity) - qty);
    const newCost = round2(Number(holding.totalCost) - gl.costBasis);
    holding.quantity = Math.max(0, newQty);
    holding.totalCost = Math.max(0, newCost);
    holding.averageCost = holding.quantity > 0 ? round2(holding.totalCost / holding.quantity) : 0;
    holding.realizedGainLoss = round2(Number(holding.realizedGainLoss || 0) + gl.realizedGainLoss);
    holding.currentPrice = price;
    holding.currentMarketValue = round2(Number(holding.quantity) * price);
    holding.unrealizedGainLoss = round2(Number(holding.currentMarketValue) - Number(holding.totalCost));
    await holding.save({ transaction });
  }

  if (confirm) {
    trade.status = 'CONFIRMED';
    await trade.save({ transaction });

    const settlementNumber = await nextSettlementNumber(req.companyId);
    await InvestmentSettlement.create(
      withCompanyId(req, {
        tradeId: trade.id,
        settlementNumber,
        expectedDate: trade.settlementDate || trade.tradeDate,
        settlementAmount: trade.netSettlement,
        settlementCurrency: 'AED',
        bankAccountId: trade.bankAccountId || null,
        status: 'PENDING',
      }),
      { transaction }
    );
  }
}

async function confirmTrade(req, id) {
  return sequelize.transaction(async (transaction) => {
    const trade = await InvestmentTrade.findOne({
      where: { id, ...companyWhere(req) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!trade) {
      const err = new Error('Trade not found');
      err.statusCode = 404;
      throw err;
    }
    if (trade.status !== 'DRAFT') {
      const err = new Error(`Trade status ${trade.status} cannot be confirmed`);
      err.statusCode = 400;
      throw err;
    }
    const preview = await previewTrade(req, {
      portfolioId: trade.portfolioId,
      instrumentId: trade.instrumentId,
      side: trade.side,
      quantity: trade.quantity,
      price: trade.price,
      commission: trade.commission,
      fees: trade.fees,
      taxes: trade.taxes,
      withholdingTax: trade.withholdingTax,
      accruedInterest: trade.accruedInterest,
      exchangeRate: trade.exchangeRate,
      costBasisMethod: trade.costBasisMethod,
      accountingPolicy: trade.accountingPolicy,
    });
    if (!preview.valid) {
      const err = new Error(preview.error);
      err.statusCode = 400;
      throw err;
    }
    await applyTradeToHoldings(req, trade, preview, { transaction, confirm: true });
    return getTrade(req, id, { transaction });
  });
}

async function cancelTrade(req, id, reason) {
  const trade = await InvestmentTrade.findOne({ where: { id, ...companyWhere(req) } });
  if (!trade) {
    const err = new Error('Trade not found');
    err.statusCode = 404;
    throw err;
  }
  if (!['DRAFT', 'CONFIRMED'].includes(trade.status)) {
    const err = new Error(`Cannot cancel trade in status ${trade.status}`);
    err.statusCode = 400;
    throw err;
  }
  if (trade.status === 'CONFIRMED') {
    const err = new Error('Confirmed trades must be reversed via settlement failure; cancel draft only in this release');
    err.statusCode = 400;
    throw err;
  }
  trade.status = 'CANCELLED';
  if (reason) trade.remarks = reason;
  await trade.save();
  return getTrade(req, id);
}

module.exports = {
  listTrades,
  getTrade,
  createTrade,
  confirmTrade,
  cancelTrade,
  previewTrade,
  previewJournal,
  findOrCreateHolding,
  nextTradeNumber,
  nextSettlementNumber,
};
