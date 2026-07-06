const { Op } = require('sequelize');
const {
  InvestmentTransaction,
  InvestmentValuationHistory,
  InvestmentHolding,
  InvestmentAccountConfiguration,
  AccountsTrans,
} = require('../../models');
const { companyWhere } = require('../../utils/companyScope');
const periodValidation = require('../periodValidationService');
const { round2 } = require('./investmentFinancePostingUtils');

const CASH_TYPES = ['BUY', 'SELL', 'DIVIDEND', 'INTEREST', 'CHARGE', 'MATURITY', 'FX_GAIN_LOSS'];

async function getMonthEndReconciliation(req, filters = {}) {
  const asOfDate = filters.asOfDate || new Date().toISOString().slice(0, 10);

  const unpostedApprovedTransactions = await InvestmentTransaction.findAll({
    where: {
      ...companyWhere(req),
      approvalStatus: 'APPROVED',
      postingStatus: { [Op.in]: ['APPROVED', 'DRAFT'] },
      transactionType: { [Op.in]: CASH_TYPES },
      transactionDate: { [Op.lte]: asOfDate },
    },
    order: [['transactionDate', 'ASC']],
    limit: 200,
  });

  const pendingValuations = await InvestmentValuationHistory.findAll({
    where: {
      ...companyWhere(req),
      approvalStatus: 'PENDING',
      valuationDate: { [Op.lte]: asOfDate },
    },
    order: [['valuationDate', 'ASC']],
    limit: 200,
  });

  const config = await InvestmentAccountConfiguration.findOne({
    where: { companyId: req.companyId, active: true },
  });

  let glInvestmentAssetBalance = 0;
  if (config?.investmentAssetAccount) {
    const rows = await AccountsTrans.findAll({
      where: { companyId: req.companyId, ledgerId: config.investmentAssetAccount },
      attributes: ['debitAmount', 'creditAmount'],
    });
    for (const r of rows) {
      glInvestmentAssetBalance += Number(r.debitAmount || 0) - Number(r.creditAmount || 0);
    }
    glInvestmentAssetBalance = round2(glInvestmentAssetBalance);
  }

  const holdings = await InvestmentHolding.findAll({ where: companyWhere(req) });
  const subLedgerTotalCost = round2(holdings.reduce((s, h) => s + Number(h.totalCost || 0), 0));

  const periodStatus = await periodValidation.getCurrentPeriodStatus(req, asOfDate);

  return {
    asOfDate,
    unpostedApprovedTransactions,
    pendingValuations,
    trialBalance: {
      glInvestmentAssetBalance,
      subLedgerTotalCost,
      difference: round2(glInvestmentAssetBalance - subLedgerTotalCost),
    },
    periodStatus,
  };
}

module.exports = { getMonthEndReconciliation };
