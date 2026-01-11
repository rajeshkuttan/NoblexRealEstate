const { BankTransaction, Payment, Invoice, Reconciliation, sequelize } = require('../models');
const { Op } = require('sequelize');

class AutoReconciliationService {
  async autoReconcile(bankAccountId, startDate, endDate) {
    const transactions = await BankTransaction.findAll({
      where: {
        bankAccountId,
        transactionDate: { [Op.between]: [startDate, endDate] },
        reconciliationStatus: 'unreconciled'
      }
    });

    let matched = 0, unmatched = 0;

    for (const txn of transactions) {
      const match = await this.findMatch(txn);
      if (match) {
        await this.createReconciliation(txn, match);
        matched++;
      } else {
        unmatched++;
      }
    }

    return { matched, unmatched, total: transactions.length };
  }

  async findMatch(transaction) {
    const amount = Math.abs(parseFloat(transaction.amount));
    const tolerance = 0.01;

    // Try exact amount match first
    let match = await Payment.findOne({
      where: {
        amount: { [Op.between]: [amount - tolerance, amount + tolerance] },
        paymentDate: {
          [Op.between]: [
            new Date(new Date(transaction.transactionDate).setDate(new Date(transaction.transactionDate).getDate() - 3)),
            new Date(new Date(transaction.transactionDate).setDate(new Date(transaction.transactionDate).getDate() + 3))
          ]
        },
        status: 'paid'
      }
    });

    if (!match) {
      // Try reference number match
      const ref = transaction.reference?.replace(/\D/g, '');
      if (ref) {
        match = await Payment.findOne({
          where: {
            [Op.or]: [
              { paymentNumber: { [Op.like]: `%${ref}%` } },
              sequelize.where(
                sequelize.fn('REPLACE', sequelize.col('reference'), ' ', ''),
                { [Op.like]: `%${ref}%` }
              )
            ]
          }
        });
      }
    }

    return match;
  }

  async createReconciliation(transaction, payment) {
    await Reconciliation.create({
      bankAccountId: transaction.bankAccountId,
      bankTransactionId: transaction.id,
      paymentId: payment.id,
      reconciliationDate: new Date(),
      amount: transaction.amount,
      status: 'matched',
      matchedBy: 'auto'
    });

    await transaction.update({ reconciliationStatus: 'reconciled' });
  }
}

module.exports = new AutoReconciliationService();
