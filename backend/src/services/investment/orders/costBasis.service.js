'use strict';

/**
 * Pure cost-basis / lot allocation helpers for Phase 18.
 * Methods: AVERAGE | FIFO | SPECIFIC (no LIFO unless configured later).
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function round4(n) {
  return Math.round((Number(n) + Number.EPSILON) * 10000) / 10000;
}

function availableLotQuantity(lots) {
  return (lots || [])
    .filter((l) => String(l.status || 'OPEN') === 'OPEN')
    .reduce((sum, l) => sum + Number(l.remainingQuantity ?? l.remaining_quantity ?? 0), 0);
}

/**
 * @param {Array<{id?:number, remainingQuantity?:number, unitCost?:number, openDate?:string, status?:string}>} lots
 * @param {number} sellQty
 * @param {'AVERAGE'|'FIFO'|'SPECIFIC'} method
 * @param {Array<{lotId:number, quantity:number}>} [specificSelections]
 */
function allocateSellLots(lots, sellQty, method = 'AVERAGE', specificSelections = []) {
  const qty = Number(sellQty);
  if (!(qty > 0)) {
    const err = new Error('Sell quantity must be positive');
    err.statusCode = 400;
    throw err;
  }

  const openLots = (lots || [])
    .filter((l) => String(l.status || 'OPEN') === 'OPEN')
    .map((l) => ({
      id: l.id,
      remainingQuantity: Number(l.remainingQuantity ?? l.remaining_quantity ?? 0),
      unitCost: Number(l.unitCost ?? l.unit_cost ?? 0),
      openDate: l.openDate || l.open_date || null,
      totalCost: Number(l.totalCost ?? l.total_cost ?? 0),
    }))
    .filter((l) => l.remainingQuantity > 0);

  const available = openLots.reduce((s, l) => s + l.remainingQuantity, 0);
  if (qty > available + 1e-9) {
    const err = new Error(`Insufficient settled quantity: available ${available}, requested ${qty}`);
    err.statusCode = 400;
    err.code = 'OVERSELL';
    throw err;
  }

  const m = String(method || 'AVERAGE').toUpperCase();
  const allocations = [];

  if (m === 'SPECIFIC') {
    if (!specificSelections || !specificSelections.length) {
      const err = new Error('Specific lot selections required for SPECIFIC cost basis');
      err.statusCode = 400;
      throw err;
    }
    let remaining = qty;
    for (const sel of specificSelections) {
      const take = Number(sel.quantity);
      if (!(take > 0)) continue;
      const lot = openLots.find((l) => Number(l.id) === Number(sel.lotId));
      if (!lot) {
        const err = new Error(`Lot ${sel.lotId} not found or closed`);
        err.statusCode = 400;
        throw err;
      }
      if (take > lot.remainingQuantity + 1e-9) {
        const err = new Error(`Lot ${lot.id} has only ${lot.remainingQuantity} remaining`);
        err.statusCode = 400;
        throw err;
      }
      allocations.push({
        lotId: lot.id,
        quantity: take,
        unitCost: lot.unitCost,
        cost: round2(take * lot.unitCost),
      });
      remaining = round4(remaining - take);
    }
    if (Math.abs(remaining) > 1e-6) {
      const err = new Error(`Specific lots must cover sell quantity (short by ${remaining})`);
      err.statusCode = 400;
      throw err;
    }
    return allocations;
  }

  if (m === 'FIFO') {
    const ordered = [...openLots].sort((a, b) => {
      const da = a.openDate || '';
      const db = b.openDate || '';
      if (da !== db) return da < db ? -1 : 1;
      return Number(a.id || 0) - Number(b.id || 0);
    });
    let remaining = qty;
    for (const lot of ordered) {
      if (remaining <= 0) break;
      const take = Math.min(lot.remainingQuantity, remaining);
      allocations.push({
        lotId: lot.id,
        quantity: take,
        unitCost: lot.unitCost,
        cost: round2(take * lot.unitCost),
      });
      remaining = round4(remaining - take);
    }
    return allocations;
  }

  // AVERAGE — consume lots FIFO for position tracking, but unit cost is weighted average
  const totalRemQty = openLots.reduce((s, l) => s + l.remainingQuantity, 0);
  const totalRemCost = openLots.reduce(
    (s, l) => s + (l.totalCost > 0 ? l.totalCost : l.remainingQuantity * l.unitCost),
    0
  );
  const avgCost = totalRemQty > 0 ? totalRemCost / totalRemQty : 0;
  const ordered = [...openLots].sort((a, b) => {
    const da = a.openDate || '';
    const db = b.openDate || '';
    if (da !== db) return da < db ? -1 : 1;
    return Number(a.id || 0) - Number(b.id || 0);
  });
  let remaining = qty;
  for (const lot of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(lot.remainingQuantity, remaining);
    allocations.push({
      lotId: lot.id,
      quantity: take,
      unitCost: round4(avgCost),
      cost: round2(take * avgCost),
      lotUnitCost: lot.unitCost,
    });
    remaining = round4(remaining - take);
  }
  return allocations;
}

function computeRealizedGainLoss(allocations, sellPrice, sellQty, fees = 0) {
  const proceeds = round2(Number(sellPrice) * Number(sellQty) - Number(fees || 0));
  const costBasis = round2(allocations.reduce((s, a) => s + Number(a.cost || 0), 0));
  const realized = round2(proceeds - costBasis);
  return { proceeds, costBasis, realizedGainLoss: realized };
}

function applyFeeAllocation(allocations, totalFees) {
  const fees = Number(totalFees || 0);
  if (!(fees > 0) || !allocations.length) {
    return allocations.map((a) => ({ ...a, feeShare: 0 }));
  }
  const totalQty = allocations.reduce((s, a) => s + Number(a.quantity), 0);
  let allocated = 0;
  return allocations.map((a, i) => {
    let share;
    if (i === allocations.length - 1) {
      share = round2(fees - allocated);
    } else {
      share = round2((Number(a.quantity) / totalQty) * fees);
      allocated = round2(allocated + share);
    }
    return { ...a, feeShare: share };
  });
}

function computeBuyLot(quantity, price, fees = 0) {
  const qty = Number(quantity);
  const gross = round2(qty * Number(price));
  const totalCost = round2(gross + Number(fees || 0));
  const unitCost = qty > 0 ? round4(totalCost / qty) : 0;
  return { quantity: qty, unitCost, totalCost, gross };
}

function computeTradeAmounts({
  side,
  quantity,
  price,
  commission = 0,
  fees = 0,
  taxes = 0,
  withholdingTax = 0,
  accruedInterest = 0,
  exchangeRate = 1,
}) {
  const qty = Number(quantity);
  const px = Number(price);
  const gross = round2(qty * px);
  const charges = round2(
    Number(commission || 0) + Number(fees || 0) + Number(taxes || 0) + Number(withholdingTax || 0)
  );
  const accrued = round2(Number(accruedInterest || 0));
  const s = String(side || '').toUpperCase();
  let netSettlement;
  if (s === 'BUY') {
    netSettlement = round2(gross + charges + accrued);
  } else {
    netSettlement = round2(gross - charges + accrued);
  }
  const fx = Number(exchangeRate) || 1;
  return {
    grossAmount: gross,
    charges,
    accruedInterest: accrued,
    netSettlement,
    baseCurrencyNet: round2(netSettlement * fx),
    exchangeRate: fx,
  };
}

function nextOrderStatus(orderQty, executedQty) {
  const o = Number(orderQty);
  const e = Number(executedQty);
  if (e <= 0) return null;
  if (e + 1e-9 >= o) return 'EXECUTED';
  return 'PARTIALLY_EXECUTED';
}

const ORDER_TRANSITIONS = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['PLACED', 'CANCELLED'],
  REJECTED: [],
  PLACED: ['PARTIALLY_EXECUTED', 'EXECUTED', 'CANCELLED', 'EXPIRED'],
  PARTIALLY_EXECUTED: ['EXECUTED', 'CANCELLED', 'EXPIRED'],
  EXECUTED: [],
  EXPIRED: [],
  CANCELLED: [],
};

function canTransitionOrder(from, to) {
  const allowed = ORDER_TRANSITIONS[String(from).toUpperCase()] || [];
  return allowed.includes(String(to).toUpperCase());
}

const SETTLEMENT_TRANSITIONS = {
  PENDING: ['PARTIALLY_SETTLED', 'SETTLED', 'FAILED', 'CANCELLED'],
  PARTIALLY_SETTLED: ['SETTLED', 'FAILED', 'CANCELLED'],
  SETTLED: ['REVERSED'],
  FAILED: ['PENDING', 'CANCELLED'],
  REVERSED: [],
  CANCELLED: [],
};

function canTransitionSettlement(from, to) {
  const allowed = SETTLEMENT_TRANSITIONS[String(from).toUpperCase()] || [];
  return allowed.includes(String(to).toUpperCase());
}

function previewJournal(trade, amounts, accountingPolicy) {
  const side = String(trade.side).toUpperCase();
  const lines = [];
  if (side === 'BUY') {
    lines.push({ account: 'Investment asset', debit: amounts.grossAmount, credit: 0 });
    if (amounts.charges > 0) {
      lines.push({ account: 'Brokerage / fees', debit: amounts.charges, credit: 0 });
    }
    lines.push({ account: 'Cash / Settlement payable', debit: 0, credit: amounts.netSettlement });
  } else {
    lines.push({ account: 'Cash / Settlement receivable', debit: amounts.netSettlement, credit: 0 });
    lines.push({ account: 'Investment asset (cost)', debit: 0, credit: Number(trade.costBasis || 0) });
    const gl = Number(trade.realizedGainLoss || 0);
    if (gl >= 0) {
      lines.push({ account: 'Realized gain', debit: 0, credit: gl });
    } else {
      lines.push({ account: 'Realized loss', debit: Math.abs(gl), credit: 0 });
    }
  }
  return {
    accountingPolicy,
    postingTrigger: accountingPolicy === 'SETTLEMENT_DATE' ? 'On settlement' : 'On trade confirm',
    lines,
  };
}

module.exports = {
  round2,
  round4,
  availableLotQuantity,
  allocateSellLots,
  computeRealizedGainLoss,
  applyFeeAllocation,
  computeBuyLot,
  computeTradeAmounts,
  nextOrderStatus,
  canTransitionOrder,
  canTransitionSettlement,
  previewJournal,
  ORDER_TRANSITIONS,
  SETTLEMENT_TRANSITIONS,
};
