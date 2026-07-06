'use strict';

const { sequelize } = require('../config/database');
const {
  InvestmentTransaction,
  AccountsTrans,
  JournalVoucher,
  BankAccount,
} = require('../models');
const { buildPostingContext } = require('./investment-posting-fixtures/context');
const { validatePostedTransaction } = require('./investment-posting-fixtures/validators');
const postingService = require('../services/investment/investmentPosting.service');
const periodValidation = require('../services/periodValidationService');

async function runValidation() {
  await sequelize.authenticate();
  const { companyId, req } = await buildPostingContext();
  const errors = [];
  const passes = [];

  const txns = await InvestmentTransaction.findAll({
    where: { companyId, remarks: { [require('sequelize').Op.like]: 'POST-FIXTURE-%' } },
  });

  for (const txn of txns) {
    if (['BONUS', 'SPLIT'].includes(txn.transactionType)) {
      const count = await AccountsTrans.count({
        where: { companyId, jvNumber: txn.transactionNo },
      });
      if (count === 0) passes.push(`${txn.transactionType}: no GL (expected)`);
      else errors.push(`${txn.transactionType}: unexpected GL lines`);
      continue;
    }
    const glLines = await AccountsTrans.findAll({
      where: txn.journalVoucherId
        ? { companyId, jvId: txn.journalVoucherId }
        : { companyId, jvNumber: txn.transactionNo },
    });
    const jv = txn.journalVoucherId
      ? await JournalVoucher.findByPk(txn.journalVoucherId)
      : null;
    const txnErrors = validatePostedTransaction(txn, glLines, jv);
    if (txnErrors.length) errors.push(...txnErrors);
    else passes.push(`${txn.transactionNo} (${txn.transactionType}): OK`);
  }

  const buyTxn = txns.find((t) => t.transactionType === 'BUY' && t.postingStatus === 'POSTED');
  if (buyTxn) {
    try {
      await postingService.postTransaction(req, buyTxn.id);
      errors.push('Duplicate post should have failed');
    } catch (e) {
      if (e.message?.includes('already posted')) passes.push('Duplicate post prevented');
      else errors.push(`Duplicate post unexpected error: ${e.message}`);
    }
  }

  const foreignBank = await BankAccount.findOne({
    where: { companyId: { [require('sequelize').Op.ne]: companyId } },
  });
  if (foreignBank && buyTxn) {
    try {
      const badReq = { ...req, companyId: foreignBank.companyId };
      await postingService.postTransaction(badReq, buyTxn.id);
    } catch (e) {
      if (e.statusCode === 404 || e.message?.includes('not found')) {
        passes.push('Company isolation on post');
      }
    }
  }

  try {
    await periodValidation.validatePostingDate(req, '2099-12-31');
  } catch (e) {
    if (e.message?.includes('closed') || e.statusCode === 400) passes.push('Period validation active');
  }

  const overallPass = errors.length === 0;
  return { overallPass, passes, errors, companyId };
}

async function main() {
  const result = await runValidation();
  console.log('Passes:', result.passes.length);
  result.passes.forEach((p) => console.log('  OK:', p));
  if (result.errors.length) {
    console.error('Errors:', result.errors.length);
    result.errors.forEach((e) => console.error('  FAIL:', e));
  }
  await sequelize.close();
  process.exit(result.overallPass ? 0 : 1);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = { runValidation };
