const { Op } = require('sequelize');
const {
  InvestmentTransaction,
  InvestmentAsset,
  InvestmentHolding,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const { round2 } = require('./investmentFinancePostingUtils');
const dashboardService = require('./investmentDashboard.service');

const CASH_IN_TYPES = ['SELL', 'DIVIDEND', 'INTEREST', 'MATURITY'];
const CASH_OUT_TYPES = ['BUY', 'CHARGE'];

async function getInvestmentTreasurySummary(req, filters = {}) {
  const where = { ...companyWhere(req), postingStatus: 'POSTED' };
  if (filters.fromDate || filters.toDate) {
    where.transactionDate = {};
    if (filters.fromDate) where.transactionDate[Op.gte] = filters.fromDate;
    if (filters.toDate) where.transactionDate[Op.lte] = filters.toDate;
  }

  const txns = await InvestmentTransaction.findAll({
    where,
    attributes: ['transactionType', 'baseAmount', 'bankAccountId', 'transactionDate'],
  });

  let totalPurchases = 0;
  let totalSalesProceeds = 0;
  let dividendsReceived = 0;
  let interestReceived = 0;
  let chargesPaid = 0;
  const byBank = new Map();

  const addBank = (bankId, inflow, outflow) => {
    if (!bankId) return;
    const key = bankId;
    const cur = byBank.get(key) || { bankAccountId: bankId, inflow: 0, outflow: 0, net: 0 };
    cur.inflow += inflow;
    cur.outflow += outflow;
    cur.net = round2(cur.inflow - cur.outflow);
    byBank.set(key, cur);
  };

  for (const t of txns) {
    const amt = round2(t.baseAmount || 0);
    const type = t.transactionType;
    if (type === 'BUY') {
      totalPurchases += amt;
      addBank(t.bankAccountId, 0, amt);
    } else if (type === 'SELL' || type === 'MATURITY') {
      totalSalesProceeds += amt;
      addBank(t.bankAccountId, amt, 0);
    } else if (type === 'DIVIDEND') {
      dividendsReceived += amt;
      addBank(t.bankAccountId, amt, 0);
    } else if (type === 'INTEREST') {
      interestReceived += amt;
      addBank(t.bankAccountId, amt, 0);
    } else if (type === 'CHARGE') {
      chargesPaid += amt;
      addBank(t.bankAccountId, 0, amt);
    }
  }

  const inflows = round2(totalSalesProceeds + dividendsReceived + interestReceived);
  const outflows = round2(totalPurchases + chargesPaid);
  const netCashFlow = round2(inflows - outflows);

  const pendingUnposted = await InvestmentTransaction.findAll({
    where: {
      ...companyWhere(req),
      approvalStatus: 'APPROVED',
      postingStatus: 'APPROVED',
      transactionType: { [Op.in]: [...CASH_IN_TYPES, ...CASH_OUT_TYPES] },
    },
    include: [{ model: InvestmentAsset, as: 'asset', attributes: ['investmentCode', 'investmentName'] }],
    order: [['transactionDate', 'DESC']],
    limit: 50,
  });

  const dashboard = await dashboardService.getDashboard(req);
  const upcomingMaturities = dashboard.maturityCalendar || [];

  return {
    totalPurchases: round2(totalPurchases),
    totalSalesProceeds: round2(totalSalesProceeds),
    dividendsReceived: round2(dividendsReceived),
    interestReceived: round2(interestReceived),
    chargesPaid: round2(chargesPaid),
    netCashFlow,
    upcomingMaturities,
    pendingUnpostedCash: pendingUnposted,
    byBankAccount: [...byBank.values()],
  };
}

module.exports = { getInvestmentTreasurySummary };
