const { sequelize } = require('../../config/database');
const {
  InvestmentAccountConfiguration,
  BankAccount,
  InvestmentDistribution,
  InvestmentDistributionLine,
} = require('../../models');
const { createPostedSystemJournalVoucher } = require('../systemJournalVoucher.service');
const { buildPostingContext } = require('../financePostingContext.service');
const { COMPANY_AUDIT_ACTIONS } = require('../companyAuditService');
const periodValidation = require('../periodValidationService');
const transactionService = require('./investmentTransaction.service');
const { companyWhere } = require('../../utils/companyScope');
const { round2, assertBalanced } = require('./investmentFinancePostingUtils');

async function getActiveAccountConfig(companyId) {
  const config = await InvestmentAccountConfiguration.findOne({
    where: { companyId, active: true },
  });
  if (!config) {
    const err = new Error('Investment account configuration is required');
    err.statusCode = 400;
    throw err;
  }
  if (!config.investmentAssetAccount) {
    const err = new Error('Investment asset account must be configured');
    err.statusCode = 400;
    throw err;
  }
  return config;
}

function requireAccount(config, field, label) {
  const id = config[field];
  if (!id) {
    const err = new Error(`${label} account must be configured`);
    err.statusCode = 400;
    throw err;
  }
  return id;
}

async function resolveBankLedgerId(bankAccountId, req, transaction) {
  const bank = await BankAccount.findOne({
    where: { id: bankAccountId, companyId: req.companyId },
    transaction,
  });
  if (!bank) {
    const err = new Error('Bank account not found in company');
    err.statusCode = 400;
    throw err;
  }
  if (!bank.chartAccountId) {
    const err = new Error('Bank account must be linked to a chart of accounts ledger');
    err.statusCode = 400;
    throw err;
  }
  return bank.chartAccountId;
}

function buildPostingLines(txn, config, holding, bankLedgerId) {
  const amount = round2(txn.baseAmount || txn.netAmount);
  const assetAcct = config.investmentAssetAccount;
  const bankAcct = bankLedgerId;
  const lines = [];
  const type = txn.transactionType;
  const ref = txn.transactionNo;

  if (type === 'BUY') {
    if (!bankAcct) throw Object.assign(new Error('Bank account required for BUY'), { statusCode: 400 });
    lines.push({ ledgerId: assetAcct, debit: amount, credit: 0, narration: `Investment BUY ${ref}` });
    lines.push({ ledgerId: bankAcct, debit: 0, credit: amount, narration: `Investment BUY ${ref}` });
  } else if (type === 'SELL') {
    if (!bankAcct) throw Object.assign(new Error('Bank account required for SELL'), { statusCode: 400 });
    const qty = Number(txn.quantity);
    const avgCost = round2(qty * Number(holding?.averageCost || 0));
    const proceeds = amount;
    const realized = round2(proceeds - avgCost);
    lines.push({ ledgerId: bankAcct, debit: proceeds, credit: 0, narration: `Investment SELL ${ref}` });
    lines.push({ ledgerId: assetAcct, debit: 0, credit: avgCost, narration: `Investment SELL cost ${ref}` });
    if (realized > 0) {
      lines.push({
        ledgerId: requireAccount(config, 'realizedGainAccount', 'Realized gain'),
        debit: 0,
        credit: realized,
        narration: `Realized gain ${ref}`,
      });
    } else if (realized < 0) {
      lines.push({
        ledgerId: requireAccount(config, 'realizedLossAccount', 'Realized loss'),
        debit: Math.abs(realized),
        credit: 0,
        narration: `Realized loss ${ref}`,
      });
    }
  } else if (type === 'DIVIDEND' || type === 'INTEREST') {
    if (!bankAcct) throw Object.assign(new Error('Bank account required for income'), { statusCode: 400 });
    const incomeAcct = type === 'DIVIDEND'
      ? requireAccount(config, 'dividendIncomeAccount', 'Dividend income')
      : requireAccount(config, 'interestIncomeAccount', 'Interest income');
    lines.push({ ledgerId: bankAcct, debit: amount, credit: 0, narration: `${type} ${ref}` });
    lines.push({ ledgerId: incomeAcct, debit: 0, credit: amount, narration: `${type} ${ref}` });
  } else if (type === 'CHARGE') {
    if (!bankAcct) throw Object.assign(new Error('Bank account required for CHARGE'), { statusCode: 400 });
    const chargeAcct = requireAccount(config, 'brokerageChargesAccount', 'Brokerage charges');
    lines.push({ ledgerId: chargeAcct, debit: amount, credit: 0, narration: `Charge ${ref}` });
    lines.push({ ledgerId: bankAcct, debit: 0, credit: amount, narration: `Charge ${ref}` });
  } else if (type === 'REVALUATION') {
    const gain = round2(txn.netAmount);
    if (gain > 0) {
      lines.push({ ledgerId: assetAcct, debit: gain, credit: 0, narration: `Revaluation gain ${ref}` });
      lines.push({
        ledgerId: requireAccount(config, 'unrealizedGainAccount', 'Unrealized gain'),
        debit: 0,
        credit: gain,
        narration: `Revaluation gain ${ref}`,
      });
    } else if (gain < 0) {
      const loss = Math.abs(gain);
      lines.push({
        ledgerId: requireAccount(config, 'unrealizedLossAccount', 'Unrealized loss'),
        debit: loss,
        credit: 0,
        narration: `Revaluation loss ${ref}`,
      });
      lines.push({ ledgerId: assetAcct, debit: 0, credit: loss, narration: `Revaluation loss ${ref}` });
    }
  } else if (type === 'FX_GAIN_LOSS') {
    const fx = round2(txn.netAmount);
    if (fx > 0) {
      lines.push({ ledgerId: assetAcct, debit: fx, credit: 0, narration: `FX gain ${ref}` });
      lines.push({
        ledgerId: requireAccount(config, 'fxGainAccount', 'FX gain'),
        debit: 0,
        credit: fx,
        narration: `FX gain ${ref}`,
      });
    } else if (fx < 0) {
      const loss = Math.abs(fx);
      lines.push({
        ledgerId: requireAccount(config, 'fxLossAccount', 'FX loss'),
        debit: loss,
        credit: 0,
        narration: `FX loss ${ref}`,
      });
      lines.push({ ledgerId: assetAcct, debit: 0, credit: loss, narration: `FX loss ${ref}` });
    }
  } else if (type === 'BONUS' || type === 'SPLIT') {
    // No GL movement — holding-only adjustment
  } else if (type === 'WRITE_OFF') {
    const qty = Number(txn.quantity);
    const costBasis = round2(qty * Number(holding?.averageCost || 0));
    const amount = round2(txn.baseAmount || costBasis);
    if (amount > 0) {
      lines.push({
        ledgerId: requireAccount(config, 'realizedLossAccount', 'Realized loss'),
        debit: amount,
        credit: 0,
        narration: `Write-off ${ref}`,
      });
      lines.push({ ledgerId: assetAcct, debit: 0, credit: amount, narration: `Write-off ${ref}` });
    }
  } else if (type === 'MATURITY') {
    if (!bankAcct) throw Object.assign(new Error('Bank account required for MATURITY'), { statusCode: 400 });
    const qty = Number(txn.quantity);
    const avgCost = round2(qty * Number(holding?.averageCost || 0));
    const proceeds = amount;
    const realized = round2(proceeds - avgCost);
    lines.push({ ledgerId: bankAcct, debit: proceeds, credit: 0, narration: `Maturity ${ref}` });
    lines.push({ ledgerId: assetAcct, debit: 0, credit: avgCost, narration: `Maturity cost ${ref}` });
    if (realized > 0) {
      lines.push({
        ledgerId: requireAccount(config, 'realizedGainAccount', 'Realized gain'),
        debit: 0,
        credit: realized,
        narration: `Maturity gain ${ref}`,
      });
    } else if (realized < 0) {
      lines.push({
        ledgerId: requireAccount(config, 'realizedLossAccount', 'Realized loss'),
        debit: Math.abs(realized),
        credit: 0,
        narration: `Maturity loss ${ref}`,
      });
    }
  } else {
    const err = new Error(`Posting not supported for transaction type ${type}`);
    err.statusCode = 400;
    throw err;
  }

  return lines;
}

async function postTransaction(req, txnId) {
  const t = await sequelize.transaction();
  try {
    const txn = await transactionService.getTransaction(req, txnId);
    buildPostingContext({ req, sourceType: 'investment_transaction', sourceId: txnId, sourceRecord: txn });

    if (txn.postingStatus === 'POSTED') {
      const err = new Error('Transaction already posted');
      err.statusCode = 400;
      throw err;
    }
    if (txn.approvalStatus !== 'APPROVED') {
      const err = new Error('Transaction must be approved before posting');
      err.statusCode = 400;
      throw err;
    }
    if (txn.postingStatus === 'CANCELLED') {
      const err = new Error('Cannot post cancelled transaction');
      err.statusCode = 400;
      throw err;
    }

    await periodValidation.validatePostingDate(req, txn.transactionDate);
    const config = await getActiveAccountConfig(req.companyId);
    const holding = txn.asset?.holding;
    let bankLedgerId = null;
    if (txn.bankAccountId) {
      bankLedgerId = await resolveBankLedgerId(txn.bankAccountId, req, t);
    }

    const rawLines = buildPostingLines(txn, config, holding, bankLedgerId);
    let journalVoucherId = null;
    if (rawLines.length > 0) {
      assertBalanced(rawLines.map((l) => ({ debitAmount: l.debit, creditAmount: l.credit })));

      const { voucher } = await createPostedSystemJournalVoucher({
        req,
        transaction: t,
        jvNumber: txn.transactionNo,
        date: txn.transactionDate,
        narration: `Investment ${txn.transactionType} ${txn.transactionNo}`,
        lines: rawLines,
        sourceType: 'investment_transaction',
        sourceId: txn.id,
        auditAction: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_CREATED,
      });
      journalVoucherId = voucher.id;
    }

    await txn.update({ postingStatus: 'POSTED', journalVoucherId }, { transaction: t });
    await t.commit();
    return txn;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function getAccountSettings(req) {
  let config = await InvestmentAccountConfiguration.findOne({
    where: { companyId: req.companyId },
  });
  if (!config) {
    config = await InvestmentAccountConfiguration.create({
      companyId: req.companyId,
      active: true,
    });
  }
  return config;
}

async function updateAccountSettings(req, data) {
  let config = await getAccountSettings(req);
  await config.update(data);
  return config;
}

async function postDistribution(req, distributionId) {
  const t = await sequelize.transaction();
  try {
    const dist = await InvestmentDistribution.findOne({
      where: { id: distributionId, ...companyWhere(req) },
      include: [{ model: InvestmentDistributionLine, as: 'lines' }],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!dist) {
      const err = new Error('Distribution not found');
      err.statusCode = 404;
      throw err;
    }
    if (dist.postingStatus === 'POSTED') {
      const err = new Error('Distribution already posted');
      err.statusCode = 400;
      throw err;
    }
    if (dist.approvalStatus !== 'APPROVED') {
      const err = new Error('Distribution must be approved before posting');
      err.statusCode = 400;
      throw err;
    }

    const amount = round2(dist.totalAmount);
    if (amount <= 0) {
      const err = new Error('Distribution amount must be positive');
      err.statusCode = 400;
      throw err;
    }

    await periodValidation.validatePostingDate(req, dist.distributionDate);
    const config = await getActiveAccountConfig(req.companyId);
    if (!dist.bankAccountId) {
      const err = new Error('Bank account is required for distribution payment');
      err.statusCode = 400;
      throw err;
    }
    const bankLedgerId = await resolveBankLedgerId(dist.bankAccountId, req, t);

    let incomeLedgerId;
    if (dist.distributionType === 'DIVIDEND') {
      incomeLedgerId = requireAccount(config, 'dividendIncomeAccount', 'Dividend income');
    } else if (dist.distributionType === 'INTEREST') {
      incomeLedgerId = requireAccount(config, 'interestIncomeAccount', 'Interest income');
    } else {
      incomeLedgerId = requireAccount(config, 'realizedGainAccount', 'Realized gain');
    }

    const ref = dist.distributionNo;
    const rawLines = [
      { ledgerId: incomeLedgerId, debit: amount, credit: 0, narration: `Partner distribution ${ref}` },
      { ledgerId: bankLedgerId, debit: 0, credit: amount, narration: `Partner distribution ${ref}` },
    ];
    assertBalanced(rawLines.map((l) => ({ debitAmount: l.debit, creditAmount: l.credit })));

    const { voucher } = await createPostedSystemJournalVoucher({
      req,
      transaction: t,
      jvNumber: ref,
      date: dist.distributionDate,
      narration: `Partner distribution ${ref}`,
      lines: rawLines,
      sourceType: 'investment_distribution',
      sourceId: dist.id,
      auditAction: COMPANY_AUDIT_ACTIONS.FINANCE_POSTING_CREATED,
    });

    await dist.update({ postingStatus: 'POSTED', journalVoucherId: voucher.id }, { transaction: t });
    await t.commit();
    return dist;
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

module.exports = {
  postTransaction,
  postDistribution,
  getAccountSettings,
  updateAccountSettings,
  getActiveAccountConfig,
  buildPostingLines,
};
