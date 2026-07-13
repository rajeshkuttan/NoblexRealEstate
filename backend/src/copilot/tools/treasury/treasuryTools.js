'use strict';

const { Op } = require('sequelize');
const { BankAccount, BankTransaction, Reconciliation } = require('../../../models');

const MAX_ROWS = 25;

async function getCashPosition({ companyId }) {
  const accounts = await BankAccount.findAll({
    where: { companyId, isActive: true, status: 'active' },
    attributes: ['id', 'bankName', 'accountName', 'accountNumber', 'currency', 'currentBalance', 'status'],
    limit: MAX_ROWS,
  });

  const byCurrency = {};
  let total = 0;
  for (const a of accounts) {
    const bal = Number(a.currentBalance || 0);
    total += bal;
    const cur = a.currency || 'AED';
    byCurrency[cur] = (byCurrency[cur] || 0) + bal;
  }

  return {
    accountCount: accounts.length,
    totalBalance: Number(total.toFixed(2)),
    byCurrency: Object.fromEntries(
      Object.entries(byCurrency).map(([k, v]) => [k, Number(v.toFixed(2))])
    ),
    accounts: accounts.map((a) => ({
      id: a.id,
      bankName: a.bankName,
      accountName: a.accountName,
      accountNumberMasked: String(a.accountNumber || '').replace(/.(?=.{4})/g, '*'),
      currency: a.currency,
      currentBalance: Number(a.currentBalance || 0),
      status: a.status,
    })),
  };
}

async function getBankAccountSummary({ companyId }) {
  const accounts = await BankAccount.findAll({
    where: { companyId },
    attributes: ['id', 'bankName', 'accountName', 'currency', 'currentBalance', 'status', 'isActive'],
    limit: MAX_ROWS,
    order: [['id', 'ASC']],
  });
  return {
    count: accounts.length,
    accounts: accounts.map((a) => ({
      id: a.id,
      bankName: a.bankName,
      accountName: a.accountName,
      currency: a.currency,
      currentBalance: Number(a.currentBalance || 0),
      status: a.status,
      isActive: a.isActive,
    })),
  };
}

async function getTreasuryExceptions({ companyId }) {
  let unreconciled = 0;
  try {
    unreconciled = await BankTransaction.count({
      where: { companyId, isReconciled: false },
    });
  } catch (_) {
    unreconciled = 0;
  }

  let openRecons = [];
  try {
    openRecons = await Reconciliation.findAll({
      where: {
        companyId,
        status: { [Op.in]: ['in_progress', 'completed'] },
      },
      attributes: ['id', 'bankAccountId', 'reconciliationDate', 'difference', 'status'],
      limit: MAX_ROWS,
      order: [['reconciliationDate', 'DESC']],
    });
  } catch (_) {
    openRecons = [];
  }

  return {
    unreconciledTransactionCount: unreconciled,
    openReconciliations: openRecons.map((r) => ({
      id: r.id,
      bankAccountId: r.bankAccountId,
      reconciliationDate: r.reconciliationDate,
      difference: Number(r.difference || 0),
      status: r.status,
    })),
  };
}

module.exports = {
  getCashPosition,
  getBankAccountSummary,
  getTreasuryExceptions,
};
