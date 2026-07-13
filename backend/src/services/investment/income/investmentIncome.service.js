'use strict';

const {
  sequelize,
  InvestmentIncomeEvent,
  InvestmentHoldingV2,
  InvestmentInstrument,
  InvestmentPortfolio,
  InvestmentPositionLot,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const {
  computeAccruedAmount,
  computeNetIncome,
  couponGross,
  interestGross,
  dividendGross,
  generatePaymentDates,
  incomeTypeForInstrument,
  canTransitionIncome,
  reconcileIncome,
  previewIncomeJournal,
  daysBetween,
  round2,
  round6,
} = require('./incomeEngine.service');
const { Op } = require('sequelize');

async function nextEventNumber(companyId) {
  const count = await InvestmentIncomeEvent.count({ where: { companyId } });
  return `INC-${String(count + 1).padStart(6, '0')}`;
}

async function listIncomeEvents(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.incomeType) where.incomeType = req.query.incomeType;
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.instrumentId) where.instrumentId = Number(req.query.instrumentId);
  if (req.query.search) {
    where[Op.or] = [{ eventNumber: { [Op.like]: `%${req.query.search}%` } }];
  }
  const { count, rows } = await InvestmentIncomeEvent.findAndCountAll({
    where,
    include: [
      { model: InvestmentInstrument, as: 'instrument', attributes: ['id', 'instrumentCode', 'instrumentName'] },
      { model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] },
    ],
    order: [['paymentDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { incomeEvents: rows, pagination: paginationMeta(count, page, limit) };
}

async function getIncomeEvent(req, id) {
  const event = await InvestmentIncomeEvent.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentInstrument, as: 'instrument' },
      { model: InvestmentPortfolio, as: 'portfolio' },
    ],
  });
  if (!event) {
    const err = new Error('Income event not found');
    err.statusCode = 404;
    throw err;
  }
  return {
    event,
    journalPreview: previewIncomeJournal(event),
  };
}

async function createIncomeEvent(req, data) {
  if (!data.portfolioId || !data.instrumentId || !data.incomeType) {
    const err = new Error('portfolioId, instrumentId, and incomeType are required');
    err.statusCode = 400;
    throw err;
  }
  const gross = Number(data.grossAmount || 0);
  const wht = Number(data.withholdingTax || 0);
  const net = data.netAmount != null ? Number(data.netAmount) : computeNetIncome(gross, wht);
  const accrued =
    data.accruedAmount != null
      ? Number(data.accruedAmount)
      : data.accrualStart && data.accrualEnd
        ? computeAccruedAmount(gross, data.accrualStart, data.accrualEnd, data.asOfDate || data.accrualEnd)
        : 0;

  return InvestmentIncomeEvent.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId,
      instrumentId: data.instrumentId,
      holdingV2Id: data.holdingV2Id || null,
      eventNumber: data.eventNumber || (await nextEventNumber(req.companyId)),
      incomeType: data.incomeType,
      declarationDate: data.declarationDate || null,
      exDate: data.exDate || null,
      recordDate: data.recordDate || null,
      paymentDate: data.paymentDate || null,
      accrualStart: data.accrualStart || null,
      accrualEnd: data.accrualEnd || null,
      quantity: Number(data.quantity || 0),
      rateOrPerUnit: data.rateOrPerUnit ?? null,
      grossAmount: gross,
      accruedAmount: accrued,
      withholdingTax: wht,
      netAmount: net,
      currencyCode: data.currencyCode || 'AED',
      exchangeRate: Number(data.exchangeRate || 1),
      status: data.status || 'EXPECTED',
      source: data.source || 'MANUAL',
      linkedTransactionId: data.linkedTransactionId || null,
      corporateActionId: data.corporateActionId || null,
      bankAccountId: data.bankAccountId || null,
      remarks: data.remarks || null,
      isTestData: !!data.isTestData,
    })
  );
}

async function transitionIncome(req, id, toStatus, extra = {}) {
  const event = await InvestmentIncomeEvent.findOne({ where: { id, ...companyWhere(req) } });
  if (!event) {
    const err = new Error('Income event not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionIncome(event.status, toStatus)) {
    const err = new Error(`Cannot transition income from ${event.status} to ${toStatus}`);
    err.statusCode = 400;
    throw err;
  }

  if (toStatus === 'ACCRUED') {
    const asOf = extra.asOfDate || new Date().toISOString().slice(0, 10);
    event.accruedAmount = computeAccruedAmount(
      event.grossAmount,
      event.accrualStart || event.paymentDate,
      event.accrualEnd || event.paymentDate,
      asOf
    );
  }
  if (toStatus === 'RECEIVABLE' || toStatus === 'RECEIVED') {
    event.netAmount = computeNetIncome(event.grossAmount, event.withholdingTax);
  }
  if (extra.bankAccountId !== undefined) event.bankAccountId = extra.bankAccountId;
  if (extra.remarks !== undefined) event.remarks = extra.remarks;

  event.status = toStatus;
  await event.save();
  return getIncomeEvent(req, id);
}

async function accrueIncome(req, id, data = {}) {
  return transitionIncome(req, id, 'ACCRUED', data);
}

async function markReceivable(req, id, data = {}) {
  return transitionIncome(req, id, 'RECEIVABLE', data);
}

async function markReceived(req, id, data = {}) {
  const current = await InvestmentIncomeEvent.findOne({ where: { id, ...companyWhere(req) } });
  if (!current) {
    const err = new Error('Income event not found');
    err.statusCode = 404;
    throw err;
  }
  // Allow EXPECTED/ACCRUED → RECEIVABLE first if needed
  if (['EXPECTED', 'ACCRUED'].includes(current.status)) {
    await transitionIncome(req, id, 'RECEIVABLE', data);
  }
  return transitionIncome(req, id, 'RECEIVED', data);
}

async function reconcileIncomeEvent(req, id, data = {}) {
  const { event } = await getIncomeEvent(req, id);
  const result = reconcileIncome({
    expectedNet: event.netAmount,
    receivedNet: data.receivedNet != null ? data.receivedNet : event.netAmount,
    bankReceipt: data.bankReceipt != null ? data.bankReceipt : event.netAmount,
    glIncome: data.glIncome != null ? data.glIncome : event.netAmount,
  });
  if (!result.matched && data.force !== true) {
    return { reconciled: false, ...result, event };
  }
  const updated = await transitionIncome(req, id, 'RECONCILED', data);
  return { reconciled: true, ...result, ...updated };
}

async function distributeIncome(req, id, data = {}) {
  return transitionIncome(req, id, 'DISTRIBUTED', data);
}

async function reinvestIncome(req, id, data = {}) {
  return sequelize.transaction(async (transaction) => {
    const event = await InvestmentIncomeEvent.findOne({
      where: { id, ...companyWhere(req) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!event) {
      const err = new Error('Income event not found');
      err.statusCode = 404;
      throw err;
    }
    if (!canTransitionIncome(event.status, 'REINVESTED')) {
      const err = new Error(`Cannot reinvest from status ${event.status}`);
      err.statusCode = 400;
      throw err;
    }

    let holding = null;
    if (event.holdingV2Id) {
      holding = await InvestmentHoldingV2.findOne({
        where: { id: event.holdingV2Id, ...companyWhere(req) },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    } else {
      holding = await InvestmentHoldingV2.findOne({
        where: {
          portfolioId: event.portfolioId,
          instrumentId: event.instrumentId,
          ...companyWhere(req),
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    }

    if (holding && Number(event.netAmount) > 0) {
      const price = Number(data.reinvestPrice || holding.currentPrice || holding.averageCost || 1);
      const addQty = round6(Number(event.netAmount) / price);
      const newQty = round6(Number(holding.quantity) + addQty);
      const newCost = round2(Number(holding.totalCost) + Number(event.netAmount));
      holding.quantity = newQty;
      holding.totalCost = newCost;
      holding.averageCost = newQty > 0 ? round2(newCost / newQty) : 0;
      holding.currentMarketValue = round2(newQty * price);
      await holding.save({ transaction });

      await InvestmentPositionLot.create(
        withCompanyId(req, {
          holdingV2Id: holding.id,
          lotRef: `${event.eventNumber}-RINV`,
          openDate: event.paymentDate || new Date().toISOString().slice(0, 10),
          quantity: addQty,
          remainingQuantity: addQty,
          unitCost: price,
          totalCost: Number(event.netAmount),
          status: 'OPEN',
        }),
        { transaction }
      );
    }

    event.status = 'REINVESTED';
    await event.save({ transaction });
    return getIncomeEvent(req, id);
  });
}

async function cancelIncome(req, id, reason) {
  return transitionIncome(req, id, 'CANCELLED', { remarks: reason });
}

/**
 * Generate expected income schedule for a holding/instrument.
 */
async function generateExpectedSchedule(req, data = {}) {
  const portfolioId = Number(data.portfolioId);
  const instrumentId = Number(data.instrumentId);
  if (!portfolioId || !instrumentId) {
    const err = new Error('portfolioId and instrumentId required');
    err.statusCode = 400;
    throw err;
  }

  const instrument = await InvestmentInstrument.findOne({
    where: { id: instrumentId, ...companyWhere(req) },
  });
  if (!instrument) {
    const err = new Error('Instrument not found');
    err.statusCode = 404;
    throw err;
  }

  const holding = await InvestmentHoldingV2.findOne({
    where: { portfolioId, instrumentId, ...companyWhere(req) },
  });
  const quantity = Number(data.quantity != null ? data.quantity : holding?.quantity || 0);
  const incomeType = data.incomeType || incomeTypeForInstrument(instrument.instrumentType, instrument.assetClass);
  const frequency = data.frequency || 'SEMI_ANNUAL';
  const startDate = data.startDate || new Date().toISOString().slice(0, 10);
  const maturityDate = data.maturityDate || instrument.maturityDate;
  const created = [];

  if (['COUPON', 'INTEREST'].includes(incomeType) && maturityDate) {
    const periods = generatePaymentDates(startDate, maturityDate, frequency);
    const periodFraction =
      frequency === 'ANNUAL' ? 1 : frequency === 'QUARTERLY' ? 0.25 : frequency === 'MONTHLY' ? 1 / 12 : 0.5;

    for (const p of periods) {
      let gross = 0;
      if (incomeType === 'COUPON') {
        gross = couponGross({
          faceValue: data.faceValue != null ? data.faceValue : instrument.faceValue || 1,
          quantity,
          couponRate: data.couponRate != null ? data.couponRate : instrument.couponRate || 0,
          periodFraction,
        });
      } else {
        const principal = Number(data.principal != null ? data.principal : holding?.totalCost || quantity);
        const days = daysBetween(p.accrualStart, p.accrualEnd) || 1;
        gross = interestGross({
          principal,
          annualRate: data.annualRate != null ? data.annualRate : instrument.couponRate || 0,
          days,
        });
      }
      const wht = round2(gross * Number(data.withholdingRate || 0));
      const event = await createIncomeEvent(req, {
        portfolioId,
        instrumentId,
        holdingV2Id: holding?.id || null,
        incomeType,
        accrualStart: p.accrualStart,
        accrualEnd: p.accrualEnd,
        paymentDate: p.paymentDate,
        quantity,
        rateOrPerUnit: data.couponRate != null ? data.couponRate : instrument.couponRate,
        grossAmount: gross,
        withholdingTax: wht,
        netAmount: computeNetIncome(gross, wht),
        status: 'EXPECTED',
        source: 'SCHEDULE',
        isTestData: !!data.isTestData,
      });
      created.push(event);
    }
  } else {
    // Single expected dividend / distribution
    const perUnit = Number(data.perUnit || data.rateOrPerUnit || 0);
    const gross = data.grossAmount != null ? Number(data.grossAmount) : dividendGross({ quantity, perUnit });
    const wht = Number(data.withholdingTax || 0);
    const event = await createIncomeEvent(req, {
      portfolioId,
      instrumentId,
      holdingV2Id: holding?.id || null,
      incomeType,
      declarationDate: data.declarationDate || startDate,
      exDate: data.exDate || null,
      recordDate: data.recordDate || null,
      paymentDate: data.paymentDate || maturityDate || startDate,
      quantity,
      rateOrPerUnit: perUnit || null,
      grossAmount: gross,
      withholdingTax: wht,
      netAmount: computeNetIncome(gross, wht),
      status: 'EXPECTED',
      source: 'SCHEDULE',
      isTestData: !!data.isTestData,
    });
    created.push(event);
  }

  return { created: created.length, incomeEvents: created };
}

async function runAccruals(req, data = {}) {
  const asOf = data.asOfDate || new Date().toISOString().slice(0, 10);
  const where = {
    ...companyWhere(req),
    status: { [Op.in]: ['EXPECTED', 'ACCRUED'] },
    accrualStart: { [Op.ne]: null },
    accrualEnd: { [Op.ne]: null },
  };
  if (data.portfolioId) where.portfolioId = Number(data.portfolioId);
  const events = await InvestmentIncomeEvent.findAll({ where });
  const updated = [];
  for (const event of events) {
    if (String(event.accrualStart) > asOf) continue;
    event.accruedAmount = computeAccruedAmount(event.grossAmount, event.accrualStart, event.accrualEnd, asOf);
    if (event.status === 'EXPECTED') event.status = 'ACCRUED';
    await event.save();
    updated.push(event);
  }
  return { asOf, updated: updated.length, events: updated };
}

module.exports = {
  listIncomeEvents,
  getIncomeEvent,
  createIncomeEvent,
  accrueIncome,
  markReceivable,
  markReceived,
  reconcileIncomeEvent,
  distributeIncome,
  reinvestIncome,
  cancelIncome,
  generateExpectedSchedule,
  runAccruals,
  transitionIncome,
};
