const { Reconciliation, BankAccount, BankTransaction, User } = require('../models');
const { Op } = require('sequelize');
const autoReconciliationService = require('../services/autoReconciliationService');

// Get all reconciliations with pagination
exports.getAllReconciliations = async (req, res) => {
  try {
    const { page = 1, limit = 10, bankAccountId, status } = req.query;
    const offset = (page - 1) * limit;

    const where = { isActive: true };
    if (bankAccountId) where.bankAccountId = bankAccountId;
    if (status) where.status = status;

    const { count, rows } = await Reconciliation.findAndCountAll({
      where,
      include: [
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName', 'accountNumber']
        },
        {
          model: User,
          as: 'reconciler',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['reconciliationDate', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        reconciliations: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get reconciliations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reconciliations',
      error: error.message
    });
  }
};

// Get reconciliation statistics
exports.getReconciliationStats = async (req, res) => {
  try {
    // Total reconciliations
    const totalReconciliations = await Reconciliation.count({
      where: { isActive: true }
    });

    // Reconciliations by status
    const byStatus = await Reconciliation.findAll({
      where: { isActive: true },
      attributes: [
        'status',
        [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Unreconciled transactions
    const unreconciledTransactions = await BankTransaction.count({
      where: {
        isActive: true,
        isReconciled: false
      }
    });

    // This month's reconciliations
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthReconciliations = await Reconciliation.count({
      where: {
        isActive: true,
        reconciliationDate: {
          [Op.gte]: startOfMonth
        }
      }
    });

    res.json({
      success: true,
      data: {
        total: totalReconciliations,
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        unreconciledTransactions,
        thisMonth: thisMonthReconciliations
      }
    });
  } catch (error) {
    console.error('Get reconciliation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reconciliation statistics',
      error: error.message
    });
  }
};

exports.autoReconcile = async (req, res) => {
  try {
    const { bankAccountId, startDate, endDate } = req.body;
    const result = await autoReconciliationService.autoReconcile(bankAccountId, startDate, endDate);
    res.status(200).json({ success: true, message: 'Auto-reconciliation completed', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Auto-reconciliation failed', error: error.message });
  }
};
