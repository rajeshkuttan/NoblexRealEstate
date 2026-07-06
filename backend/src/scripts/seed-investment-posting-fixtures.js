'use strict';

/**
 * Seed investment posting fixtures for live DB integration tests.
 */
const { sequelize } = require('../config/database');
const {
  ChartOfAccount,
  BankAccount,
  InvestmentAsset,
  InvestmentAccountConfiguration,
} = require('../models');
const { buildPostingContext } = require('./investment-posting-fixtures/context');
const portfolioService = require('../services/investment/investmentPortfolio.service');
const transactionService = require('../services/investment/investmentTransaction.service');
const postingService = require('../services/investment/investmentPosting.service');

const PREFIX = 'INV-POST-';

async function ensureCoa(companyId, code, name, type) {
  const [acct] = await ChartOfAccount.findOrCreate({
    where: { companyId, accountCode: code },
    defaults: { companyId, accountCode: code, accountName: name, accountType: type, level: 1, isActive: true },
  });
  return acct;
}

async function runSeed() {
  await sequelize.authenticate();
  const { companyId, req } = await buildPostingContext();

  const assetAcct = await ensureCoa(companyId, '1500-POST', 'Investment Assets Post Test', 'asset');
  const bankAcct = await ensureCoa(companyId, '1120-POST', 'Bank Post Test', 'asset');
  const divAcct = await ensureCoa(companyId, '4100-POST', 'Dividend Income Post', 'revenue');
  const intAcct = await ensureCoa(companyId, '4200-POST', 'Interest Income Post', 'revenue');
  const gainAcct = await ensureCoa(companyId, '4300-POST', 'Realized Gain Post', 'revenue');
  const lossAcct = await ensureCoa(companyId, '5400-POST', 'Realized Loss Post', 'expense');
  const ugAcct = await ensureCoa(companyId, '4400-POST', 'Unrealized Gain Post', 'revenue');
  const ulAcct = await ensureCoa(companyId, '5500-POST', 'Unrealized Loss Post', 'expense');
  const chgAcct = await ensureCoa(companyId, '5600-POST', 'Brokerage Charges Post', 'expense');
  const fxGainAcct = await ensureCoa(companyId, '4500-POST', 'FX Gain Post', 'revenue');
  const fxLossAcct = await ensureCoa(companyId, '5700-POST', 'FX Loss Post', 'expense');

  const [bank] = await BankAccount.findOrCreate({
    where: { companyId, accountNumber: 'POST-TEST-001' },
    defaults: {
      companyId,
      bankName: 'Post Test Bank',
      accountName: 'Investment Posting Test',
      accountNumber: 'POST-TEST-001',
      currency: 'AED',
      chartAccountId: bankAcct.id,
      isActive: true,
      createdBy: req.user.id,
    },
  });
  if (!bank.chartAccountId) await bank.update({ chartAccountId: bankAcct.id });

  await InvestmentAccountConfiguration.upsert({
    companyId,
    investmentAssetAccount: assetAcct.id,
    dividendIncomeAccount: divAcct.id,
    interestIncomeAccount: intAcct.id,
    realizedGainAccount: gainAcct.id,
    realizedLossAccount: lossAcct.id,
    unrealizedGainAccount: ugAcct.id,
    unrealizedLossAccount: ulAcct.id,
    brokerageChargesAccount: chgAcct.id,
    fxGainAccount: fxGainAcct.id,
    fxLossAccount: fxLossAcct.id,
    active: true,
  });

  let asset = await InvestmentAsset.findOne({ where: { companyId, investmentCode: `${PREFIX}ASSET` } });
  if (!asset) {
    asset = await portfolioService.createAsset(req, {
      investmentCode: `${PREFIX}ASSET`,
      investmentName: 'Posting Test ETF',
      assetType: 'equity',
      currencyCode: 'AED',
      status: 'ACTIVE',
      acquisitionDate: '2025-01-01',
    });
  }

  const scenarios = [
    { type: 'BUY', qty: 100, price: 10, amount: 1000 },
    { type: 'DIVIDEND', qty: 0, price: 0, amount: 500 },
    { type: 'INTEREST', qty: 0, price: 0, amount: 200 },
    { type: 'CHARGE', qty: 0, price: 0, amount: 50 },
    { type: 'BONUS', qty: 10, price: 0, amount: 0 },
    { type: 'SPLIT', qty: 0, price: 0, amount: 0, splitRatio: 2 },
    { type: 'REVALUATION', qty: 0, price: 0, netAmount: 500 },
    { type: 'FX_GAIN_LOSS', qty: 0, price: 0, netAmount: 100 },
    { type: 'SELL', qty: 20, price: 15, amount: 300 },
    { type: 'MATURITY', qty: 10, price: 12, amount: 120 },
    { type: 'WRITE_OFF', qty: 5, price: 0, amount: 50 },
  ];

  const posted = [];
  const { transactions: existingTxns } = await transactionService.listTransactions(req, { limit: 500 });

  for (const sc of scenarios) {
    const remark = `POST-FIXTURE-${sc.type}`;
    let txn = existingTxns.find((t) => t.remarks === remark);
    if (txn?.postingStatus === 'POSTED' && (['BONUS', 'SPLIT'].includes(sc.type) || txn.journalVoucherId)) {
      posted.push(txn);
      continue;
    }

    const payload = {
      investmentAssetId: asset.id,
      transactionType: sc.type,
      transactionDate: '2026-03-01',
      quantity: sc.qty || 0,
      unitPrice: sc.splitRatio || sc.price || 0,
      grossAmount: sc.amount || Math.abs(sc.netAmount || 0),
      netAmount: sc.netAmount != null ? sc.netAmount : (sc.amount || 0),
      baseAmount: sc.amount || Math.abs(sc.netAmount || 0),
      bankAccountId: ['BONUS', 'SPLIT', 'REVALUATION', 'WRITE_OFF'].includes(sc.type) ? null : bank.id,
      remarks: remark,
    };
    if (sc.type === 'SPLIT') payload.splitRatio = sc.splitRatio || 2;

    if (!txn) {
      txn = await transactionService.createTransaction(req, payload);
    }
    if (txn.approvalStatus !== 'APPROVED') {
      txn = await transactionService.approveTransaction(req, txn.id);
    }
    if (!['BONUS', 'SPLIT'].includes(sc.type) && txn.postingStatus !== 'POSTED') {
      txn = await postingService.postTransaction(req, txn.id);
    }
    posted.push(txn);
  }

  return { companyId, assetId: asset.id, bankId: bank.id, postedCount: posted.length };
}

async function runSeedAndClose() {
  try {
    const result = await runSeed();
    await sequelize.close();
    return result;
  } catch (e) {
    await sequelize.close().catch(() => {});
    throw e;
  }
}

if (require.main === module) {
  runSeedAndClose()
    .then((r) => {
      console.log('Posting fixtures seeded:', r);
      process.exit(0);
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { runSeed, runSeedAndClose };
