'use strict';

/**
 * Pure partner capital + distribution waterfall helpers (Phase 20).
 */

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function round6(n) {
  return Math.round((Number(n) + Number.EPSILON) * 1e6) / 1e6;
}

function sumBy(rows, key) {
  return round2((rows || []).reduce((s, r) => s + Number(r[key] || 0), 0));
}

/** Closing = opening + contributions + income + gain - loss - distributions - ROC */
function computeCapitalAccountClosing(account) {
  const opening = Number(account.openingBalance ?? account.opening_balance ?? 0);
  const contributions = Number(account.contributions ?? 0);
  const income = Number(account.allocatedIncome ?? account.allocated_income ?? 0);
  const gain = Number(account.allocatedGain ?? account.allocated_gain ?? 0);
  const loss = Number(account.allocatedLoss ?? account.allocated_loss ?? 0);
  const distributions = Number(account.distributions ?? 0);
  const roc = Number(account.returnOfCapital ?? account.return_of_capital ?? 0);
  return round2(opening + contributions + income + gain - loss - distributions - roc);
}

function reconcileCapitalAccounts(accounts) {
  const rows = (accounts || []).map((a) => {
    const closing = computeCapitalAccountClosing(a);
    const stated = Number(a.closingBalance ?? a.closing_balance ?? closing);
    return {
      investorId: a.investorId ?? a.investor_id,
      computedClosing: closing,
      statedClosing: stated,
      balanced: Math.abs(closing - stated) < 0.01,
    };
  });
  return {
    balanced: rows.every((r) => r.balanced),
    rows,
    totalClosing: round2(rows.reduce((s, r) => s + r.computedClosing, 0)),
  };
}

/**
 * Active ownership as of a date — pick latest effective_from <= asOf with no effective_to or effective_to >= asOf.
 */
function ownershipAsOf(historyRows, asOfDate) {
  const asOf = String(asOfDate || '').slice(0, 10);
  const active = (historyRows || []).filter((h) => {
    const from = String(h.effectiveFrom || h.effective_from || '').slice(0, 10);
    const to = h.effectiveTo || h.effective_to;
    if (!from || from > asOf) return false;
    if (to && String(to).slice(0, 10) < asOf) return false;
    const status = String(h.status || 'ACTIVE').toUpperCase();
    return status === 'ACTIVE' || status === 'SUPERSEDED';
  });

  // Prefer ACTIVE over SUPERSEDED; then latest effective_from
  const byInvestor = new Map();
  for (const h of active) {
    const id = Number(h.investorId ?? h.investor_id);
    const existing = byInvestor.get(id);
    const from = String(h.effectiveFrom || h.effective_from);
    if (!existing) {
      byInvestor.set(id, h);
      continue;
    }
    const exStatus = String(existing.status || '').toUpperCase();
    const hStatus = String(h.status || '').toUpperCase();
    const exFrom = String(existing.effectiveFrom || existing.effective_from);
    if (hStatus === 'ACTIVE' && exStatus !== 'ACTIVE') byInvestor.set(id, h);
    else if (hStatus === exStatus && from >= exFrom) byInvestor.set(id, h);
  }
  return [...byInvestor.values()];
}

function validateOwnershipTotal(rows, tolerance = 0.01) {
  const total = round6(
    (rows || []).reduce((s, r) => s + Number(r.ownershipPercentage ?? r.ownership_percentage ?? 0), 0)
  );
  return {
    total,
    valid: Math.abs(total - 100) <= tolerance || Math.abs(total - 1) <= tolerance / 100,
    // accept either 100-based or 1-based fractions mistakenly — prefer 100-based
  };
}

function dayBefore(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * Pro-rata allocation of amount by ownership %.
 * ownership is 0–100.
 */
function allocateProRata(amount, investors) {
  const totalPct = (investors || []).reduce(
    (s, i) => s + Number(i.ownershipPercentage ?? i.ownership_percentage ?? 0),
    0
  );
  if (!(totalPct > 0)) return [];
  let allocated = 0;
  const rows = investors.map((inv, idx) => {
    const pct = Number(inv.ownershipPercentage ?? inv.ownership_percentage ?? 0);
    let share;
    if (idx === investors.length - 1) {
      share = round2(Number(amount) - allocated);
    } else {
      share = round2((Number(amount) * pct) / totalPct);
      allocated = round2(allocated + share);
    }
    return {
      investorId: inv.investorId ?? inv.investor_id,
      ownershipPercentage: pct,
      preferredAmount: 0,
      catchUpAmount: 0,
      residualAmount: share,
      carriedInterestAmount: 0,
      grossAmount: share,
      netAmount: share,
      tierBreakdown: [{ tier: 'PRO_RATA', amount: share }],
    };
  });
  return rows;
}

/**
 * American-style waterfall:
 * 1. Return of capital / preferred return to LPs (pro-rata by commitment or ownership)
 * 2. GP catch-up to carried % of profits so far
 * 3. Residual split LP/GP by (1-carry)/carry
 *
 * @param {object} opts
 * @param {number} opts.distributable
 * @param {Array} opts.lps - { investorId, ownershipPercentage, committedCapital?, preferredAccrued? }
 * @param {number} opts.preferredRate - annual preferred as decimal of capital (simplified: absolute preferred pool)
 * @param {number} opts.preferredPool - absolute preferred amount to pay LPs first (if set, overrides rate calc)
 * @param {number} opts.carryPercent - e.g. 20 for 20%
 * @param {number|null} opts.gpInvestorId - investor id receiving carry/catch-up
 * @param {number} opts.withholdingRate - e.g. 0.05
 */
function runWaterfall(opts = {}) {
  const distributable = round2(Number(opts.distributable || 0));
  const lps = opts.lps || [];
  const carryPct = Number(opts.carryPercent != null ? opts.carryPercent : 20) / 100;
  const gpId = opts.gpInvestorId != null ? Number(opts.gpInvestorId) : null;
  const whtRate = Number(opts.withholdingRate || 0);

  if (String(opts.mode || 'PRO_RATA').toUpperCase() === 'PRO_RATA' || !gpId) {
    const rows = allocateProRata(distributable, lps);
    return finalizeWht(rows, whtRate, {
      preferredPaid: 0,
      catchUpPaid: 0,
      residualPool: distributable,
      carryPaid: 0,
    });
  }

  let remaining = distributable;
  const preferredPool = round2(
    opts.preferredPool != null
      ? Number(opts.preferredPool)
      : sumBy(lps, 'preferredAccrued') || round2(distributable * Number(opts.preferredRate || 0))
  );

  // Tier 1 — preferred to LPs
  const preferredPay = Math.min(remaining, preferredPool);
  const prefRows = allocateProRata(preferredPay, lps);
  remaining = round2(remaining - preferredPay);

  // Build map
  const byId = new Map();
  for (const r of prefRows) {
    byId.set(Number(r.investorId), {
      investorId: r.investorId,
      ownershipPercentage: r.ownershipPercentage,
      preferredAmount: r.grossAmount,
      catchUpAmount: 0,
      residualAmount: 0,
      carriedInterestAmount: 0,
      grossAmount: r.grossAmount,
      tierBreakdown: [{ tier: 'PREFERRED', amount: r.grossAmount }],
    });
  }
  for (const lp of lps) {
    const id = Number(lp.investorId ?? lp.investor_id);
    if (!byId.has(id)) {
      byId.set(id, {
        investorId: id,
        ownershipPercentage: Number(lp.ownershipPercentage ?? lp.ownership_percentage ?? 0),
        preferredAmount: 0,
        catchUpAmount: 0,
        residualAmount: 0,
        carriedInterestAmount: 0,
        grossAmount: 0,
        tierBreakdown: [],
      });
    }
  }
  if (!byId.has(gpId)) {
    byId.set(gpId, {
      investorId: gpId,
      ownershipPercentage: 0,
      preferredAmount: 0,
      catchUpAmount: 0,
      residualAmount: 0,
      carriedInterestAmount: 0,
      grossAmount: 0,
      tierBreakdown: [],
    });
  }

  // Tier 2 — GP catch-up: GP receives until carry% of (preferred+catchup) = catchup
  // Ideal catch-up = preferredPay * carryPct / (1 - carryPct)
  let catchUpPaid = 0;
  if (remaining > 0 && carryPct > 0 && carryPct < 1) {
    const idealCatchUp = round2((preferredPay * carryPct) / (1 - carryPct));
    catchUpPaid = Math.min(remaining, idealCatchUp);
    const gp = byId.get(gpId);
    gp.catchUpAmount = catchUpPaid;
    gp.grossAmount = round2(gp.grossAmount + catchUpPaid);
    gp.tierBreakdown.push({ tier: 'CATCH_UP', amount: catchUpPaid });
    remaining = round2(remaining - catchUpPaid);
  }

  // Tier 3 — residual split
  const residualPool = remaining;
  let carryPaid = 0;
  if (remaining > 0) {
    carryPaid = round2(remaining * carryPct);
    const lpResidual = round2(remaining - carryPaid);
    const lpRows = allocateProRata(lpResidual, lps);
    for (const r of lpRows) {
      const row = byId.get(Number(r.investorId));
      row.residualAmount = round2(row.residualAmount + r.grossAmount);
      row.grossAmount = round2(row.grossAmount + r.grossAmount);
      row.tierBreakdown.push({ tier: 'RESIDUAL_LP', amount: r.grossAmount });
    }
    const gp = byId.get(gpId);
    gp.carriedInterestAmount = round2(gp.carriedInterestAmount + carryPaid);
    gp.grossAmount = round2(gp.grossAmount + carryPaid);
    gp.tierBreakdown.push({ tier: 'CARRIED_INTEREST', amount: carryPaid });
    remaining = 0;
  }

  const rows = [...byId.values()].filter((r) => Number(r.grossAmount) !== 0 || Number(r.ownershipPercentage) > 0);
  return finalizeWht(rows, whtRate, {
    preferredPaid: preferredPay,
    catchUpPaid,
    residualPool,
    carryPaid,
  });
}

function finalizeWht(rows, whtRate, summary) {
  const out = rows.map((r) => {
    const wht = round2(Number(r.grossAmount) * Number(whtRate || 0));
    return {
      ...r,
      withholdingTax: wht,
      netAmount: round2(Number(r.grossAmount) - wht),
    };
  });
  return {
    lines: out,
    summary: {
      ...summary,
      totalGross: sumBy(out, 'grossAmount'),
      totalNet: sumBy(out, 'netAmount'),
      totalWht: sumBy(out, 'withholdingTax'),
    },
  };
}

function allocateCapitalCall(totalAmount, commitments) {
  const active = (commitments || []).filter((c) => Number(c.unfundedAmount ?? c.unfunded_amount ?? 0) > 0);
  const totalUnfunded = sumBy(active, 'unfundedAmount') || sumBy(active, 'unfunded_amount');
  if (!(totalUnfunded > 0)) return [];
  let allocated = 0;
  return active.map((c, idx) => {
    const unfunded = Number(c.unfundedAmount ?? c.unfunded_amount ?? 0);
    let called;
    if (idx === active.length - 1) {
      called = round2(Math.min(unfunded, Number(totalAmount) - allocated));
    } else {
      called = round2(Math.min(unfunded, (Number(totalAmount) * unfunded) / totalUnfunded));
      allocated = round2(allocated + called);
    }
    return {
      investorId: c.investorId ?? c.investor_id,
      commitmentId: c.id,
      calledAmount: called,
      receivedAmount: 0,
      outstandingAmount: called,
      status: 'PENDING',
    };
  });
}

const DIST_TRANSITIONS = {
  DRAFT: ['CALCULATED', 'CANCELLED'],
  CALCULATED: ['UNDER_REVIEW', 'APPROVED', 'DRAFT', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'CALCULATED', 'CANCELLED'],
  APPROVED: ['PAYABLE_CREATED', 'PAYMENT_AUTHORIZED', 'PAID', 'CANCELLED'],
  PAYABLE_CREATED: ['PAYMENT_AUTHORIZED', 'PAID'],
  PAYMENT_AUTHORIZED: ['PAID'],
  PAID: ['RECONCILED'],
  RECONCILED: ['STATEMENT_ISSUED'],
  STATEMENT_ISSUED: [],
  CANCELLED: [],
};

function canTransitionDistribution(from, to) {
  return (DIST_TRANSITIONS[String(from).toUpperCase()] || []).includes(String(to).toUpperCase());
}

const CALL_TRANSITIONS = {
  DRAFT: ['ISSUED', 'CANCELLED'],
  ISSUED: ['PARTIALLY_FUNDED', 'FUNDED', 'CANCELLED'],
  PARTIALLY_FUNDED: ['FUNDED', 'CANCELLED'],
  FUNDED: [],
  CANCELLED: [],
};

function canTransitionCapitalCall(from, to) {
  return (CALL_TRANSITIONS[String(from).toUpperCase()] || []).includes(String(to).toUpperCase());
}

function partnerStatement({ investor, capitalAccount, ownership, distributions }) {
  return {
    investorCode: investor?.investorCode || investor?.investor_code,
    legalName: investor?.legalName || investor?.legal_name,
    period: capitalAccount?.period,
    ownershipPercentage: ownership?.ownershipPercentage ?? ownership?.ownership_percentage ?? null,
    capitalAccount: capitalAccount
      ? {
          opening: Number(capitalAccount.openingBalance ?? capitalAccount.opening_balance ?? 0),
          contributions: Number(capitalAccount.contributions ?? 0),
          allocatedIncome: Number(capitalAccount.allocatedIncome ?? capitalAccount.allocated_income ?? 0),
          allocatedGain: Number(capitalAccount.allocatedGain ?? capitalAccount.allocated_gain ?? 0),
          allocatedLoss: Number(capitalAccount.allocatedLoss ?? capitalAccount.allocated_loss ?? 0),
          distributions: Number(capitalAccount.distributions ?? 0),
          returnOfCapital: Number(capitalAccount.returnOfCapital ?? capitalAccount.return_of_capital ?? 0),
          closing: computeCapitalAccountClosing(capitalAccount),
        }
      : null,
    distributionLines: distributions || [],
  };
}

module.exports = {
  round2,
  round6,
  sumBy,
  computeCapitalAccountClosing,
  reconcileCapitalAccounts,
  ownershipAsOf,
  validateOwnershipTotal,
  dayBefore,
  allocateProRata,
  runWaterfall,
  allocateCapitalCall,
  canTransitionDistribution,
  canTransitionCapitalCall,
  partnerStatement,
  DIST_TRANSITIONS,
  CALL_TRANSITIONS,
};
