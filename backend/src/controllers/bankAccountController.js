/**
 * Bank Account Controller
 * Handles bank account and treasury management operations
 * Part of: Phase 3.2 - Treasury Management APIs
 */

const { BankAccount, BankTransaction, Reconciliation, ChartOfAccount, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Get all bank accounts
 */
exports.getAllBankAccounts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      currency = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    const whereClause = { isActive: true };

    if (search) {
      whereClause[Op.or] = [
        { bankName: { [Op.like]: `%${search}%` } },
        { accountName: { [Op.like]: `%${search}%` } },
        { accountNumber: { [Op.like]: `%${search}%` } },
        { iban: { [Op.like]: `%${search}%` } }
      ];
    }

    if (status) whereClause.status = status;
    if (currency) whereClause.currency = currency;

    const { count, rows: bankAccounts } = await BankAccount.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ChartOfAccount,
          as: 'chartAccount',
          attributes: ['id', 'accountName', 'accountCode'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      distinct: true
    });

    // Enrich with transaction statistics
    const enrichedAccounts = await Promise.all(
      bankAccounts.map(async (account) => {
        const accountData = account.toJSON();

        const transactionStats = await BankTransaction.findOne({
          where: { bankAccountId: account.id, isActive: true },
          attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalTransactions'],
            [sequelize.fn('SUM', sequelize.literal(`CASE WHEN transaction_type = 'credit' THEN amount ELSE 0 END`)), 'totalCredits'],
            [sequelize.fn('SUM', sequelize.literal(`CASE WHEN transaction_type = 'debit' THEN ABS(amount) ELSE 0 END`)), 'totalDebits'],
            [sequelize.fn('COUNT', sequelize.literal(`CASE WHEN is_reconciled = 0 THEN 1 END`)), 'unreconciledCount']
          ],
          raw: true
        });

        return {
          ...accountData,
          statistics: {
            totalTransactions: parseInt(transactionStats?.totalTransactions || 0),
            totalCredits: parseFloat(transactionStats?.totalCredits || 0),
            totalDebits: parseFloat(transactionStats?.totalDebits || 0),
            unreconciledCount: parseInt(transactionStats?.unreconciledCount || 0)
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        bankAccounts: enrichedAccounts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all bank accounts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank accounts',
      error: error.message
    });
  }
};

/**
 * Get bank account by ID
 */
exports.getBankAccountById = async (req, res) => {
  try {
    const { id } = req.params;

    const bankAccount = await BankAccount.findOne({
      where: { id, isActive: true },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ChartOfAccount,
          as: 'chartAccount',
          required: false
        },
        {
          model: BankTransaction,
          as: 'transactions',
          where: { isActive: true },
          required: false,
          limit: 20,
          order: [['transactionDate', 'DESC']],
          include: [
            {
              model: Reconciliation,
              as: 'reconciliation',
              attributes: ['id', 'reconciliationDate', 'status'],
              required: false
            }
          ]
        },
        {
          model: Reconciliation,
          as: 'reconciliations',
          where: { isActive: true },
          required: false,
          limit: 10,
          order: [['reconciliationDate', 'DESC']]
        }
      ]
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    res.status(200).json({
      success: true,
      data: bankAccount
    });
  } catch (error) {
    console.error('Get bank account by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank account',
      error: error.message
    });
  }
};

/**
 * Create new bank account
 */
exports.createBankAccount = async (req, res) => {
  try {
    const {
      bankName,
      accountName,
      accountNumber,
      iban,
      swiftCode,
      currency,
      currentBalance,
      chartAccountId,
      status,
      notes
    } = req.body;

    // Check for duplicate account number
    const existingAccount = await BankAccount.findOne({
      where: { accountNumber, isActive: true }
    });

    if (existingAccount) {
      return res.status(400).json({
        success: false,
        message: 'Bank account with this account number already exists'
      });
    }

    // Check for duplicate IBAN if provided
    if (iban) {
      const existingIBAN = await BankAccount.findOne({
        where: { iban, isActive: true }
      });

      if (existingIBAN) {
        return res.status(400).json({
          success: false,
          message: 'Bank account with this IBAN already exists'
        });
      }
    }

    // Create bank account
    const bankAccount = await BankAccount.create({
      bankName,
      accountName,
      accountNumber,
      iban: iban || null,
      swiftCode: swiftCode || null,
      currency: currency || 'AED',
      currentBalance: parseFloat(currentBalance || 0),
      chartAccountId: chartAccountId || null,
      status: status || 'active',
      notes,
      createdBy: req.user.id
    });

    // Fetch created bank account with associations
    const createdAccount = await BankAccount.findByPk(bankAccount.id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ChartOfAccount,
          as: 'chartAccount',
          required: false
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Bank account created successfully',
      data: createdAccount
    });
  } catch (error) {
    console.error('Create bank account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bank account',
      error: error.message
    });
  }
};

/**
 * Update bank account
 */
exports.updateBankAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      bankName,
      accountName,
      iban,
      swiftCode,
      currency,
      currentBalance,
      chartAccountId,
      status,
      notes
    } = req.body;

    const bankAccount = await BankAccount.findOne({
      where: { id, isActive: true }
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    // Check for duplicate IBAN (excluding current account)
    if (iban && iban !== bankAccount.iban) {
      const existingIBAN = await BankAccount.findOne({
        where: {
          iban,
          isActive: true,
          id: { [Op.ne]: id }
        }
      });

      if (existingIBAN) {
        return res.status(400).json({
          success: false,
          message: 'Bank account with this IBAN already exists'
        });
      }
    }

    await bankAccount.update({
      bankName: bankName || bankAccount.bankName,
      accountName: accountName || bankAccount.accountName,
      iban: iban !== undefined ? iban : bankAccount.iban,
      swiftCode: swiftCode !== undefined ? swiftCode : bankAccount.swiftCode,
      currency: currency || bankAccount.currency,
      currentBalance: currentBalance !== undefined ? parseFloat(currentBalance) : bankAccount.currentBalance,
      chartAccountId: chartAccountId !== undefined ? chartAccountId : bankAccount.chartAccountId,
      status: status || bankAccount.status,
      notes: notes !== undefined ? notes : bankAccount.notes
    });

    const updatedAccount = await BankAccount.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email']
        },
        {
          model: ChartOfAccount,
          as: 'chartAccount',
          required: false
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Bank account updated successfully',
      data: updatedAccount
    });
  } catch (error) {
    console.error('Update bank account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bank account',
      error: error.message
    });
  }
};

/**
 * Delete bank account (soft delete)
 */
exports.deleteBankAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const bankAccount = await BankAccount.findOne({
      where: { id, isActive: true }
    });

    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found'
      });
    }

    // Check for unreconciled transactions
    const unreconciledCount = await BankTransaction.count({
      where: {
        bankAccountId: id,
        isActive: true,
        isReconciled: false
      }
    });

    if (unreconciledCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete bank account with ${unreconciledCount} unreconciled transaction(s)`
      });
    }

    await bankAccount.update({ isActive: false });

    res.status(200).json({
      success: true,
      message: 'Bank account deleted successfully'
    });
  } catch (error) {
    console.error('Delete bank account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank account',
      error: error.message
    });
  }
};

/**
 * Get cash position dashboard
 */
exports.getCashPosition = async (req, res) => {
  try {
    // Get all active bank accounts with balances
    const bankAccounts = await BankAccount.findAll({
      where: { isActive: true, status: 'active' },
      attributes: ['id', 'bankName', 'accountName', 'currency', 'currentBalance'],
      order: [['bankName', 'ASC']]
    });

    // Calculate totals by currency and overall total
    const balanceByCurrency = {};
    let totalBalanceAED = 0;
    
    // Exchange rates (simplified - in production, fetch from exchange_rates table)
    const exchangeRates = {
      'AED': 1,
      'USD': 3.6725,
      'EUR': 4.12,
      'GBP': 4.85,
      'SAR': 0.979,
      'QAR': 1.009
    };

    bankAccounts.forEach(account => {
      const currency = account.currency;
      const balance = parseFloat(account.currentBalance) || 0;
      
      // Group by currency
      if (!balanceByCurrency[currency]) {
        balanceByCurrency[currency] = {
          currency,
          balance: 0,
          accountCount: 0
        };
      }
      balanceByCurrency[currency].balance += balance;
      balanceByCurrency[currency].accountCount += 1;

      // Convert to AED for total
      const rate = exchangeRates[currency] || 1;
      totalBalanceAED += balance * rate;
    });

    // Convert object to array
    const balanceByCurrencyArray = Object.values(balanceByCurrency);

    // Get recent transactions across all accounts
    const recentTransactions = await BankTransaction.findAll({
      where: { isActive: true },
      include: [
        {
          model: BankAccount,
          as: 'bankAccount',
          attributes: ['id', 'bankName', 'accountName']
        }
      ],
      limit: 10,
      order: [['transactionDate', 'DESC']]
    });

    // Get unreconciled transaction count
    const unreconciledCount = await BankTransaction.count({
      where: { isActive: true, isReconciled: false }
    });

    res.status(200).json({
      success: true,
      data: {
        totalBalance: totalBalanceAED,
        balanceByCurrency: balanceByCurrencyArray,
        bankAccounts,
        recentTransactions,
        unreconciledCount,
        summary: {
          totalAccounts: bankAccounts.length,
          activeAccounts: bankAccounts.filter(a => a.status === 'active').length
        }
      }
    });
  } catch (error) {
    console.error('Get cash position error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cash position',
      error: error.message
    });
  }
};

/**
 * Get bank account statistics
 */
exports.getBankAccountStats = async (req, res) => {
  try {
    const totalAccounts = await BankAccount.count({
      where: { isActive: true }
    });

    const accountsByStatus = await BankAccount.findAll({
      where: { isActive: true },
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    const accountsByCurrency = await BankAccount.findAll({
      where: { isActive: true },
      attributes: [
        'currency',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('current_balance')), 'totalBalance']
      ],
      group: ['currency'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: {
        totalAccounts,
        accountsByStatus,
        accountsByCurrency
      }
    });
  } catch (error) {
    console.error('Get bank account stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank account statistics',
      error: error.message
    });
  }
};

