/**
 * Bank Transaction Controller
 * Handles bank statement import and transaction management
 * Part of: Phase 3.2 - Treasury Management APIs
 */

const { BankTransaction, BankAccount, Reconciliation, sequelize } = require('../models');
const { Op } = require('sequelize');
const { companyWhere, withCompanyId, assertBankInCompany } = require('../utils/companyScope');
const { logFinancePostingEvent } = require('../services/financePostingContext.service');
const periodValidation = require('../services/periodValidationService');
const { COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

/**
 * Get all bank transactions
 */
exports.getAllBankTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      bankAccountId = '',
      transactionType = '',
      isReconciled = '',
      startDate = '',
      endDate = '',
      sortBy = 'transactionDate',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isActive: true, ...companyWhere(req) };

    if (bankAccountId) whereClause.bankAccountId = bankAccountId;
    if (transactionType) whereClause.transactionType = transactionType;
    if (isReconciled !== '') whereClause.isReconciled = isReconciled === 'true';

    if (startDate && endDate) {
      whereClause.transactionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereClause.transactionDate = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      whereClause.transactionDate = { [Op.lte]: new Date(endDate) };
    }

    const { count, rows: transactions } = await BankTransaction.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName', 'accountNumber']
        },
        {
          model: Reconciliation,
          as: 'reconciliation',
          attributes: ['id', 'reconciliationDate', 'status'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]]
    });

    res.status(200).json({
      success: true,
      data: {
        transactions,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all bank transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank transactions',
      error: error.message
    });
  }
};

/**
 * Get bank transaction by ID
 */
exports.getBankTransactionById = async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await BankTransaction.findOne({
      where: { id, isActive: true, ...companyWhere(req) },
      include: [
        {
          model: BankAccount,
          as: 'bankAccount'
        },
        {
          model: Reconciliation,
          as: 'reconciliation',
          required: false
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Bank transaction not found'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Get bank transaction by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank transaction',
      error: error.message
    });
  }
};

/**
 * Import bank transactions from statement (bulk create)
 */
exports.importBankTransactions = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { bankAccountId, transactions } = req.body;

    // Verify bank account exists
    await assertBankInCompany(bankAccountId, req);
    const bankAccount = await BankAccount.findOne({
      where: { id: bankAccountId, isActive: true, ...companyWhere(req) }
    });

    if (!bankAccount) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    // Validate and prepare transactions
    const preparedTransactions = transactions.map(txn => withCompanyId(req, {
      bankAccountId,
      transactionDate: new Date(txn.transactionDate),
      description: txn.description || '',
      reference: txn.reference || null,
      amount: parseFloat(txn.amount),
      currency: txn.currency || bankAccount.currency,
      transactionType: parseFloat(txn.amount) >= 0 ? 'credit' : 'debit',
      isReconciled: false,
      notes: txn.notes || null,
      createdBy: req.user?.id || null
    }));

    // Bulk insert transactions
    const createdTransactions = await BankTransaction.bulkCreate(
      preparedTransactions,
      { transaction }
    );

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: `Successfully imported ${createdTransactions.length} transactions`,
      data: {
        imported: createdTransactions.length,
        transactions: createdTransactions
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Import bank transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to import bank transactions',
      error: error.message
    });
  }
};

/**
 * Create single bank transaction
 */
exports.createBankTransaction = async (req, res) => {
  try {
    const {
      bankAccountId,
      transactionDate,
      description,
      reference,
      amount,
      currency,
      transactionType,
      notes
    } = req.body;

    // Verify bank account exists
    await assertBankInCompany(bankAccountId, req);
    const bankAccount = await BankAccount.findOne({
      where: { id: bankAccountId, isActive: true, ...companyWhere(req) },
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    await periodValidation.validatePostingDate(req, transactionDate);

    const bankTransaction = await BankTransaction.create(
      withCompanyId(req, {
      bankAccountId,
      transactionDate: new Date(transactionDate),
      description,
      reference: reference || null,
      amount: parseFloat(amount),
      currency: currency || bankAccount.currency,
      transactionType: transactionType || (parseFloat(amount) >= 0 ? 'credit' : 'debit'),
      isReconciled: false,
      notes,
      createdBy: req.user.id
    })
    );

    await logFinancePostingEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.BANK_TRANSACTION_POSTED,
      companyId: req.companyId,
      metadata: { source_type: 'bank_transaction', source_id: bankTransaction.id },
    });

    const createdTransaction = await BankTransaction.findByPk(bankTransaction.id, {
      include: [
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Bank transaction created successfully',
      data: createdTransaction
    });
  } catch (error) {
    console.error('Create bank transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bank transaction',
      error: error.message
    });
  }
};

/**
 * Update bank transaction
 */
exports.updateBankTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, reference, notes } = req.body;

    const bankTransaction = await BankTransaction.findOne({
      where: { id, isActive: true, ...companyWhere(req) }
    });

    if (!bankTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Bank transaction not found'
      });
    }

    // Prevent editing reconciled transactions
    if (bankTransaction.isReconciled) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit reconciled transaction'
      });
    }

    await bankTransaction.update({
      description: description || bankTransaction.description,
      reference: reference !== undefined ? reference : bankTransaction.reference,
      notes: notes !== undefined ? notes : bankTransaction.notes
    });

    const updatedTransaction = await BankTransaction.findByPk(id, {
      include: [
        {
          model: BankAccount,
          as: 'bankAccount'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Bank transaction updated successfully',
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Update bank transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bank transaction',
      error: error.message
    });
  }
};

/**
 * Delete bank transaction
 */
exports.deleteBankTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    const bankTransaction = await BankTransaction.findOne({
      where: { id, isActive: true, ...companyWhere(req) }
    });

    if (!bankTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Bank transaction not found'
      });
    }

    // Prevent deleting reconciled transactions
    if (bankTransaction.isReconciled) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete reconciled transaction'
      });
    }

    await bankTransaction.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Bank transaction deleted successfully'
    });
  } catch (error) {
    console.error('Delete bank transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank transaction',
      error: error.message
    });
  }
};

/**
 * Get unreconciled transactions for a bank account
 */
exports.getUnreconciledTransactions = async (req, res) => {
  try {
    const { bankAccountId } = req.params;
    await assertBankInCompany(bankAccountId, req);

    const unreconciledTransactions = await BankTransaction.findAll({
      where: {
        bankAccountId,
        isActive: true,
        isReconciled: false,
        ...companyWhere(req),
      },
      include: [
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName']
        }
      ],
      order: [['transactionDate', 'DESC']]
    });

    // Calculate totals
    const totals = unreconciledTransactions.reduce(
      (acc, txn) => {
        const amount = parseFloat(txn.amount);
        if (txn.transactionType === 'credit') {
          acc.credits += amount;
        } else {
          acc.debits += Math.abs(amount);
        }
        acc.net += amount;
        return acc;
      },
      { credits: 0, debits: 0, net: 0 }
    );

    res.status(200).json({
      success: true,
      data: {
        transactions: unreconciledTransactions,
        summary: {
          count: unreconciledTransactions.length,
          totalCredits: totals.credits,
          totalDebits: totals.debits,
          netAmount: totals.net
        }
      }
    });
  } catch (error) {
    console.error('Get unreconciled transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unreconciled transactions',
      error: error.message
    });
  }
};

/**
 * Get transaction statistics
 */
exports.getTransactionStats = async (req, res) => {
  try {
    const { bankAccountId, startDate, endDate } = req.query;

    const whereClause = { isActive: true, ...companyWhere(req) };
    if (bankAccountId) whereClause.bankAccountId = bankAccountId;
    if (startDate && endDate) {
      whereClause.transactionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const stats = await BankTransaction.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
        [sequelize.fn('SUM', sequelize.literal(`CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END`)), 'totalCredits'],
        [sequelize.fn('SUM', sequelize.literal(`CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END`)), 'totalDebits'],
        [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN is_reconciled = 0 THEN 1 END`)), 'unreconciledCount'],
        [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN is_reconciled = 1 THEN 1 END`)), 'reconciledCount']
      ],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        totalTransactions: parseInt(stats.totalTransactions || 0),
        totalCredits: parseFloat(stats.totalCredits || 0),
        totalDebits: parseFloat(stats.totalDebits || 0),
        netAmount: parseFloat(stats.totalCredits || 0) - parseFloat(stats.totalDebits || 0),
        unreconciledCount: parseInt(stats.unreconciledCount || 0),
        reconciledCount: parseInt(stats.reconciledCount || 0)
      }
    });
  } catch (error) {
    console.error('Get transaction stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction statistics',
      error: error.message
    });
  }
};

