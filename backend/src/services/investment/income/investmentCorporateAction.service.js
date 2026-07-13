'use strict';

const {
  sequelize,
  InvestmentCorporateAction,
  InvestmentEntitlement,
  InvestmentHoldingV2,
  InvestmentInstrument,
  InvestmentPortfolio,
  InvestmentIncomeEvent,
  InvestmentPositionLot,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const {
  computeEntitlement,
  canTransitionCorporateAction,
  computeNetIncome,
  round2,
  round6,
} = require('./incomeEngine.service');
const { Op } = require('sequelize');

async function nextActionNumber(companyId) {
  const count = await InvestmentCorporateAction.count({ where: { companyId } });
  return `CA-${String(count + 1).padStart(6, '0')}`;
}

async function listCorporateActions(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.actionType) where.actionType = req.query.actionType;
  if (req.query.instrumentId) where.instrumentId = Number(req.query.instrumentId);
  if (req.query.search) {
    where[Op.or] = [{ actionNumber: { [Op.like]: `%${req.query.search}%` } }];
  }
  const { count, rows } = await InvestmentCorporateAction.findAndCountAll({
    where,
    include: [
      { model: InvestmentInstrument, as: 'instrument', attributes: ['id', 'instrumentCode', 'instrumentName'] },
    ],
    order: [['effectiveDate', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { corporateActions: rows, pagination: paginationMeta(count, page, limit) };
}

async function getCorporateAction(req, id) {
  const action = await InvestmentCorporateAction.findOne({
    where: { id, ...companyWhere(req) },
    include: [
      { model: InvestmentInstrument, as: 'instrument' },
      {
        model: InvestmentEntitlement,
        as: 'entitlements',
        include: [
          { model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] },
        ],
      },
    ],
  });
  if (!action) {
    const err = new Error('Corporate action not found');
    err.statusCode = 404;
    throw err;
  }
  return action;
}

async function createCorporateAction(req, data) {
  if (!data.instrumentId || !data.actionType) {
    const err = new Error('instrumentId and actionType are required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentCorporateAction.create(
    withCompanyId(req, {
      instrumentId: data.instrumentId,
      actionNumber: data.actionNumber || (await nextActionNumber(req.companyId)),
      actionType: data.actionType,
      announcementDate: data.announcementDate || null,
      exDate: data.exDate || null,
      recordDate: data.recordDate || null,
      effectiveDate: data.effectiveDate || null,
      electionDeadline: data.electionDeadline || null,
      ratioNumerator: data.ratioNumerator ?? data.ratio ?? 1,
      ratioDenominator: data.ratioDenominator ?? 1,
      cashComponent: data.cashComponent ?? null,
      stockComponent: data.stockComponent ?? null,
      newInstrumentId: data.newInstrumentId || null,
      status: data.status || 'ANNOUNCED',
      sourceDocumentId: data.sourceDocumentId || null,
      remarks: data.remarks || null,
      isTestData: !!data.isTestData,
    })
  );
}

/**
 * Build entitlements from holdings as of record date (uses current holdings_v2 quantity).
 * Record-date historical snapshots are Phase 22; here we use live holding qty at entitlement time.
 */
async function generateEntitlements(req, actionId) {
  const action = await InvestmentCorporateAction.findOne({
    where: { id: actionId, ...companyWhere(req) },
  });
  if (!action) {
    const err = new Error('Corporate action not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionCorporateAction(action.status, 'ENTITLED') && action.status !== 'ENTITLED') {
    const err = new Error(`Cannot generate entitlements from status ${action.status}`);
    err.statusCode = 400;
    throw err;
  }

  const holdings = await InvestmentHoldingV2.findAll({
    where: {
      instrumentId: action.instrumentId,
      ...companyWhere(req),
      quantity: { [Op.gt]: 0 },
    },
  });

  const holdingDate = action.recordDate || action.exDate || action.effectiveDate || new Date().toISOString().slice(0, 10);
  const created = [];

  await sequelize.transaction(async (transaction) => {
    await InvestmentEntitlement.destroy({
      where: { corporateActionId: action.id, ...companyWhere(req), status: 'PENDING' },
      transaction,
    });

    for (const h of holdings) {
      const calc = computeEntitlement({
        actionType: action.actionType,
        eligibleQuantity: Number(h.quantity),
        ratioNumerator: action.ratioNumerator,
        ratioDenominator: action.ratioDenominator,
        cashComponent: action.cashComponent,
        stockComponent: action.stockComponent,
      });
      const row = await InvestmentEntitlement.create(
        withCompanyId(req, {
          corporateActionId: action.id,
          portfolioId: h.portfolioId,
          holdingV2Id: h.id,
          holdingDate,
          eligibleQuantity: calc.eligibleQuantity,
          entitlementQuantity: calc.entitlementQuantity,
          entitlementCash: calc.entitlementCash,
          status: 'PENDING',
          isTestData: !!action.isTestData,
        }),
        { transaction }
      );
      created.push(row);
    }

    action.status = 'ENTITLED';
    await action.save({ transaction });
  });

  return getCorporateAction(req, actionId);
}

async function applyCorporateAction(req, actionId) {
  return sequelize.transaction(async (transaction) => {
    const action = await InvestmentCorporateAction.findOne({
      where: { id: actionId, ...companyWhere(req) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!action) {
      const err = new Error('Corporate action not found');
      err.statusCode = 404;
      throw err;
    }
    if (!canTransitionCorporateAction(action.status, 'APPLIED')) {
      const err = new Error(`Cannot apply corporate action from status ${action.status}`);
      err.statusCode = 400;
      throw err;
    }

    const entitlements = await InvestmentEntitlement.findAll({
      where: {
        corporateActionId: action.id,
        ...companyWhere(req),
        status: { [Op.in]: ['PENDING', 'CONFIRMED'] },
      },
      transaction,
    });

    for (const ent of entitlements) {
      const calc = computeEntitlement({
        actionType: action.actionType,
        eligibleQuantity: Number(ent.eligibleQuantity),
        ratioNumerator: action.ratioNumerator,
        ratioDenominator: action.ratioDenominator,
        cashComponent: action.cashComponent,
        stockComponent: action.stockComponent,
      });

      if (ent.holdingV2Id) {
        const holding = await InvestmentHoldingV2.findOne({
          where: { id: ent.holdingV2Id, ...companyWhere(req) },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (holding) {
          const type = String(action.actionType).toUpperCase();
          if (['STOCK_SPLIT', 'REVERSE_SPLIT', 'BONUS_ISSUE', 'STOCK_DIVIDEND', 'MERGER', 'CONVERSION'].includes(type)) {
            const newQty = calc.resultingQuantity;
            // Cost basis preserved on split/bonus (average cost dilutes)
            holding.quantity = newQty;
            holding.averageCost = newQty > 0 ? round2(Number(holding.totalCost) / newQty) : 0;
            holding.currentMarketValue = round2(newQty * Number(holding.currentPrice || 0));
            holding.unrealizedGainLoss = round2(Number(holding.currentMarketValue) - Number(holding.totalCost));
            await holding.save({ transaction });

            // Scale open lots proportionally for splits
            if (['STOCK_SPLIT', 'REVERSE_SPLIT'].includes(type)) {
              const factor =
                Number(action.ratioDenominator || 1) !== 0
                  ? Number(action.ratioNumerator || 1) / Number(action.ratioDenominator || 1)
                  : 1;
              const lots = await InvestmentPositionLot.findAll({
                where: { holdingV2Id: holding.id, status: 'OPEN', ...companyWhere(req) },
                transaction,
              });
              for (const lot of lots) {
                lot.quantity = round6(Number(lot.quantity) * factor);
                lot.remainingQuantity = round6(Number(lot.remainingQuantity) * factor);
                lot.unitCost = factor !== 0 ? round2(Number(lot.unitCost) / factor) : lot.unitCost;
                await lot.save({ transaction });
              }
            } else if (['BONUS_ISSUE', 'STOCK_DIVIDEND'].includes(type) && calc.entitlementQuantity > 0) {
              await InvestmentPositionLot.create(
                withCompanyId(req, {
                  holdingV2Id: holding.id,
                  lotRef: `${action.actionNumber}-BONUS`,
                  openDate: action.effectiveDate || action.recordDate,
                  quantity: calc.entitlementQuantity,
                  remainingQuantity: calc.entitlementQuantity,
                  unitCost: 0,
                  totalCost: 0,
                  status: 'OPEN',
                }),
                { transaction }
              );
            }
          } else if (['REDEMPTION', 'MATURITY', 'CALL'].includes(type)) {
            holding.quantity = 0;
            holding.totalCost = 0;
            holding.averageCost = 0;
            holding.currentMarketValue = 0;
            await holding.save({ transaction });
            await InvestmentPositionLot.update(
              { remainingQuantity: 0, status: 'CLOSED' },
              { where: { holdingV2Id: holding.id, status: 'OPEN', ...companyWhere(req) }, transaction }
            );
          }
        }
      }

      // Cash entitlement → income event
      if (Number(ent.entitlementCash) > 0) {
        const incomeType =
          String(action.actionType).toUpperCase() === 'CASH_DIVIDEND' ? 'DIVIDEND' : 'CAPITAL_REPAYMENT';
        const count = await InvestmentIncomeEvent.count({ where: { companyId: req.companyId }, transaction });
        await InvestmentIncomeEvent.create(
          withCompanyId(req, {
            portfolioId: ent.portfolioId,
            instrumentId: action.instrumentId,
            holdingV2Id: ent.holdingV2Id,
            eventNumber: `INC-${String(count + 1).padStart(6, '0')}`,
            incomeType,
            declarationDate: action.announcementDate,
            exDate: action.exDate,
            recordDate: action.recordDate,
            paymentDate: action.effectiveDate,
            quantity: ent.eligibleQuantity,
            grossAmount: ent.entitlementCash,
            accruedAmount: 0,
            withholdingTax: 0,
            netAmount: computeNetIncome(ent.entitlementCash, 0),
            status: 'RECEIVABLE',
            source: 'CORPORATE_ACTION',
            corporateActionId: action.id,
            isTestData: !!action.isTestData,
          }),
          { transaction }
        );
      }

      ent.status = 'APPLIED';
      await ent.save({ transaction });
    }

    action.status = 'APPLIED';
    await action.save({ transaction });
    return getCorporateAction(req, actionId);
  });
}

async function settleCorporateAction(req, actionId) {
  const action = await InvestmentCorporateAction.findOne({
    where: { id: actionId, ...companyWhere(req) },
  });
  if (!action) {
    const err = new Error('Corporate action not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionCorporateAction(action.status, 'SETTLED')) {
    const err = new Error(`Cannot settle from status ${action.status}`);
    err.statusCode = 400;
    throw err;
  }
  action.status = 'SETTLED';
  await action.save();
  return getCorporateAction(req, actionId);
}

async function cancelCorporateAction(req, actionId, reason) {
  const action = await InvestmentCorporateAction.findOne({
    where: { id: actionId, ...companyWhere(req) },
  });
  if (!action) {
    const err = new Error('Corporate action not found');
    err.statusCode = 404;
    throw err;
  }
  if (!canTransitionCorporateAction(action.status, 'CANCELLED')) {
    const err = new Error(`Cannot cancel from status ${action.status}`);
    err.statusCode = 400;
    throw err;
  }
  action.status = 'CANCELLED';
  if (reason) action.remarks = reason;
  await action.save();
  await InvestmentEntitlement.update(
    { status: 'CANCELLED' },
    { where: { corporateActionId: action.id, ...companyWhere(req), status: { [Op.ne]: 'APPLIED' } } }
  );
  return getCorporateAction(req, actionId);
}

module.exports = {
  listCorporateActions,
  getCorporateAction,
  createCorporateAction,
  generateEntitlements,
  applyCorporateAction,
  settleCorporateAction,
  cancelCorporateAction,
};
