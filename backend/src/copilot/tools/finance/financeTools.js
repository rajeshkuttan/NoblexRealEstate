'use strict';

const { Op } = require('sequelize');
const { Invoice, Payment, SecurityDeposit, Tenant } = require('../../../models');

const MAX_ROWS = 25;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

async function getRentCollectionSummary({ companyId }) {
  const start = new Date();
  start.setDate(1);
  const monthStart = start.toISOString().slice(0, 10);

  const paidThisMonth = await Payment.findAll({
    where: {
      companyId,
      status: 'paid',
      paymentDate: { [Op.gte]: monthStart },
      isActive: true,
    },
    attributes: ['id', 'amount', 'paymentDate', 'tenantId', 'leaseId'],
    limit: MAX_ROWS,
    order: [['paymentDate', 'DESC']],
  });

  const totalCollected = paidThisMonth.reduce((s, p) => s + Number(p.amount || 0), 0);

  const openInvoices = await Invoice.count({
    where: {
      companyId,
      status: { [Op.in]: ['sent', 'overdue'] },
      isActive: true,
    },
  });

  return {
    monthStart,
    collectedCount: paidThisMonth.length,
    totalCollected: Number(totalCollected.toFixed(2)),
    openInvoiceCount: openInvoices,
    recentPayments: paidThisMonth.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      paymentDate: p.paymentDate,
      tenantId: p.tenantId,
      leaseId: p.leaseId,
    })),
  };
}

async function getOverdueRent({ companyId }) {
  const today = todayIso();
  const rows = await Invoice.findAll({
    where: {
      companyId,
      isActive: true,
      status: { [Op.in]: ['sent', 'overdue'] },
      dueDate: { [Op.lt]: today },
    },
    attributes: ['id', 'invoiceNumber', 'tenantId', 'leaseId', 'totalAmount', 'dueDate', 'status'],
    limit: MAX_ROWS,
    order: [['dueDate', 'ASC']],
  });
  const total = rows.reduce((s, r) => s + Number(r.totalAmount || 0), 0);
  return {
    count: rows.length,
    totalOverdue: Number(total.toFixed(2)),
    invoices: rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      tenantId: r.tenantId,
      leaseId: r.leaseId,
      totalAmount: Number(r.totalAmount),
      dueDate: r.dueDate,
      status: r.status,
    })),
  };
}

async function getReceivableAging({ companyId }) {
  const today = new Date();
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
  const counts = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };

  const rows = await Invoice.findAll({
    where: {
      companyId,
      isActive: true,
      status: { [Op.in]: ['sent', 'overdue'] },
    },
    attributes: ['id', 'totalAmount', 'dueDate'],
  });

  for (const r of rows) {
    const due = new Date(r.dueDate);
    const days = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    const amt = Number(r.totalAmount || 0);
    let key = 'current';
    if (days > 90) key = 'd90_plus';
    else if (days > 60) key = 'd61_90';
    else if (days > 30) key = 'd31_60';
    else if (days > 0) key = 'd1_30';
    buckets[key] += amt;
    counts[key] += 1;
  }

  return {
    amounts: Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, Number(v.toFixed(2))])),
    counts,
    invoiceCount: rows.length,
  };
}

async function getTenantOutstanding({ companyId, tenantId, search }) {
  let resolvedTenantId = tenantId ? Number(tenantId) : null;
  if (!resolvedTenantId && search) {
    const tenant = await Tenant.findOne({
      where: {
        companyId,
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ],
      },
      attributes: ['id', 'name'],
    });
    if (!tenant) return { tenant: null, outstanding: 0, invoices: [] };
    resolvedTenantId = tenant.id;
  }
  if (!resolvedTenantId) {
    const err = new Error('tenantId or search is required');
    err.status = 400;
    throw err;
  }

  const invoices = await Invoice.findAll({
    where: {
      companyId,
      tenantId: resolvedTenantId,
      isActive: true,
      status: { [Op.in]: ['sent', 'overdue'] },
    },
    attributes: ['id', 'invoiceNumber', 'totalAmount', 'dueDate', 'status'],
    limit: MAX_ROWS,
    order: [['dueDate', 'ASC']],
  });
  const outstanding = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const tenant = await Tenant.findOne({
    where: { id: resolvedTenantId, companyId },
    attributes: ['id', 'name', 'email', 'phone'],
  });
  return {
    tenant: tenant ? tenant.toJSON() : { id: resolvedTenantId },
    outstanding: Number(outstanding.toFixed(2)),
    invoices: invoices.map((i) => i.toJSON()),
  };
}

async function getSecurityDepositSummary({ companyId }) {
  const deposits = await SecurityDeposit.findAll({
    where: { companyId },
    attributes: ['id', 'amount', 'status', 'leaseId', 'tenantId', 'propertyId'],
    limit: 200,
  });
  const byStatus = {};
  let heldTotal = 0;
  for (const d of deposits) {
    byStatus[d.status] = (byStatus[d.status] || 0) + 1;
    if (d.status === 'held' || d.status === 'partially_released') {
      heldTotal += Number(d.amount || 0);
    }
  }
  return {
    count: deposits.length,
    byStatus,
    heldTotal: Number(heldTotal.toFixed(2)),
    sample: deposits.slice(0, MAX_ROWS).map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      status: d.status,
      leaseId: d.leaseId,
      tenantId: d.tenantId,
    })),
  };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Collected revenue by calendar month for a year (paid payments).
 * Optional year defaults to current calendar year.
 */
async function getMonthlyRevenue({ companyId, year }) {
  const y = Number(year) || new Date().getFullYear();
  const startDate = new Date(y, 0, 1);
  const endDate = new Date(y, 11, 31, 23, 59, 59);
  const sequelize = Payment.sequelize;

  const monthlyCollectedRaw = await Payment.findAll({
    attributes: [
      [sequelize.fn('MONTH', sequelize.col('payment_date')), 'month'],
      [sequelize.fn('SUM', sequelize.col('amount')), 'revenue'],
      [sequelize.fn('COUNT', sequelize.col('id')), 'paymentCount'],
    ],
    where: {
      companyId,
      status: 'paid',
      isActive: true,
      paymentDate: { [Op.between]: [startDate, endDate] },
    },
    group: [sequelize.fn('MONTH', sequelize.col('payment_date'))],
    order: [[sequelize.col('month'), 'ASC']],
    raw: true,
  });

  const byMonthMap = new Map(
    monthlyCollectedRaw.map((r) => [
      Number(r.month),
      {
        collected: Number(Number(r.revenue || 0).toFixed(2)),
        paymentCount: Number(r.paymentCount || 0),
      },
    ])
  );

  const months = MONTH_LABELS.map((label, idx) => {
    const month = idx + 1;
    const row = byMonthMap.get(month) || { collected: 0, paymentCount: 0 };
    return {
      month,
      label: `${label} ${y}`,
      collected: row.collected,
      paymentCount: row.paymentCount,
    };
  });

  const yearTotal = Number(months.reduce((s, m) => s + m.collected, 0).toFixed(2));
  const monthsWithActivity = months.filter((m) => m.collected > 0 || m.paymentCount > 0).length;

  return {
    year: y,
    currency: 'AED',
    metric: 'collected_payments',
    description: `Paid payment collections by month for ${y}`,
    yearTotal,
    monthsWithActivity,
    months,
  };
}

module.exports = {
  getRentCollectionSummary,
  getOverdueRent,
  getReceivableAging,
  getTenantOutstanding,
  getSecurityDepositSummary,
  getMonthlyRevenue,
};
