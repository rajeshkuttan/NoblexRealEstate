const { FinancialTransaction, ChartOfAccount, User } = require('../models');
const { Op } = require('sequelize');
const { companyWhere, withCompanyId } = require('../utils/companyScope');

// Get all financial transactions
const getAllTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, type, category, accountId } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { ...companyWhere(req) };
    if (search) {
      whereClause[Op.or] = [
        { transactionNumber: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { reference: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (type) whereClause.transactionType = type;
    if (category) whereClause.category = category;
    if (accountId) whereClause.accountId = accountId;

    const transactions = await FinancialTransaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['transactionDate', 'DESC']],
      include: [
        {
          model: ChartOfAccount,
          as: 'account'
        },
        {
          model: User,
          as: 'creator'
        },
        {
          model: User,
          as: 'approver'
        }
      ]
    });

    res.json({
      success: true,
      data: {
        transactions: transactions.rows,
        pagination: {
          total: transactions.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(transactions.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get transaction by ID
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transaction = await FinancialTransaction.findByPk(id, {
      include: [
        {
          model: ChartOfAccount,
          as: 'account'
        },
        {
          model: User,
          as: 'creator'
        },
        {
          model: User,
          as: 'approver'
        }
      ]
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// Create new transaction
const createTransaction = async (req, res, next) => {
  try {
    const transactionData = req.body;
    
    // Generate transaction number
    const transactionCount = await FinancialTransaction.count();
    transactionData.transactionNumber = `TXN-${new Date().getFullYear()}-${String(transactionCount + 1).padStart(3, '0')}`;
    
    const transaction = await FinancialTransaction.create(withCompanyId(req, transactionData));

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// Update transaction
const updateTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const transaction = await FinancialTransaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.update(updateData);

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// Delete transaction
const deleteTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transaction = await FinancialTransaction.findByPk(id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.destroy();

    res.json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Approve transaction
const approveTransaction = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const transaction = await FinancialTransaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    await transaction.update({
      status: 'approved',
      approvedBy,
      approvedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Transaction approved successfully',
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

// Get transaction statistics
const getTransactionStats = async (req, res, next) => {
  try {
    const totalTransactions = await FinancialTransaction.count();
    const pendingTransactions = await FinancialTransaction.count({ where: { status: 'pending' } });
    const approvedTransactions = await FinancialTransaction.count({ where: { status: 'approved' } });
    const rejectedTransactions = await FinancialTransaction.count({ where: { status: 'rejected' } });

    // Calculate total amounts
    const totalDebits = await FinancialTransaction.sum('amount', { where: { transactionType: 'debit' } });
    const totalCredits = await FinancialTransaction.sum('amount', { where: { transactionType: 'credit' } });

    res.json({
      success: true,
      data: {
        counts: {
          total: totalTransactions,
          pending: pendingTransactions,
          approved: approvedTransactions,
          rejected: rejectedTransactions
        },
        amounts: {
          totalDebits: totalDebits || 0,
          totalCredits: totalCredits || 0,
          netAmount: (totalCredits || 0) - (totalDebits || 0)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get transactions by date range
const getTransactionsByDateRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.transactionDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const transactions = await FinancialTransaction.findAll({
      where: whereClause,
      include: [
        {
          model: ChartOfAccount,
          as: 'account'
        },
        {
          model: User,
          as: 'creator'
        }
      ],
      order: [['transactionDate', 'DESC']]
    });

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

// Get transactions by reference (e.g., invoice number)
const getTransactionsByReference = async (req, res, next) => {
  try {
    const { reference } = req.params;
    
    const transactions = await FinancialTransaction.findAll({
      where: {
        reference: reference
      },
      order: [['transactionDate', 'ASC'], ['transactionType', 'ASC']],
      include: [
        {
          model: ChartOfAccount,
          as: 'account',
          attributes: ['id', 'accountCode', 'accountName', 'accountType']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    res.json({
      success: true,
      data: {
        transactions: transactions
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  getTransactionStats,
  getTransactionsByDateRange,
  getTransactionsByReference
};
