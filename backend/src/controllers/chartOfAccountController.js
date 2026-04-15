const { ChartOfAccount, FinancialTransaction } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

// Get all chart of accounts
const getAllAccounts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, type, level, sortBy = 'id', sortOrder = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { accountCode: { [Op.like]: `%${search}%` } },
        { accountName: { [Op.like]: `%${search}%` } }
      ];
    }
    if (type) whereClause.accountType = type;
    if (level) whereClause.level = level;

    const accounts = await ChartOfAccount.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder]],
      include: [
        {
          model: ChartOfAccount,
          as: 'parentAccount'
        },
        {
          model: ChartOfAccount,
          as: 'subAccounts'
        }
      ]
    });

    res.json({
      success: true,
      data: {
        accounts: accounts.rows,
        pagination: {
          total: accounts.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(accounts.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get account by ID
const getAccountById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await ChartOfAccount.findByPk(id, {
      include: [
        {
          model: ChartOfAccount,
          as: 'parentAccount'
        },
        {
          model: ChartOfAccount,
          as: 'subAccounts'
        },
        {
          model: FinancialTransaction,
          as: 'transactions',
          limit: 10,
          order: [['created_at', 'DESC']]
        }
      ]
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: account
    });
  } catch (error) {
    next(error);
  }
};

// Create new account
const createAccount = async (req, res, next) => {
  try {
    const accountData = req.body;
    const account = await ChartOfAccount.create(accountData);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: account
    });
  } catch (error) {
    next(error);
  }
};

// Update account
const updateAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const account = await ChartOfAccount.findByPk(id);
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    await account.update(updateData);

    res.json({
      success: true,
      message: 'Account updated successfully',
      data: account
    });
  } catch (error) {
    next(error);
  }
};

// Delete account
const deleteAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const account = await ChartOfAccount.findByPk(id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found'
      });
    }

    await account.destroy();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Get account hierarchy
const getAccountHierarchy = async (req, res, next) => {
  try {
    const accounts = await ChartOfAccount.findAll({
      where: { parentAccountId: null },
      include: [
        {
          model: ChartOfAccount,
          as: 'subAccounts',
          include: [
            {
              model: ChartOfAccount,
              as: 'subAccounts'
            }
          ]
        }
      ],
      order: [['accountCode', 'ASC']]
    });

    res.json({
      success: true,
      data: accounts
    });
  } catch (error) {
    next(error);
  }
};

// Get account statistics
const getAccountStats = async (req, res, next) => {
  try {
    const totalAccounts = await ChartOfAccount.count();
    const assetAccounts = await ChartOfAccount.count({ where: { accountType: 'asset' } });
    const liabilityAccounts = await ChartOfAccount.count({ where: { accountType: 'liability' } });
    const equityAccounts = await ChartOfAccount.count({ where: { accountType: 'equity' } });
    const revenueAccounts = await ChartOfAccount.count({ where: { accountType: 'revenue' } });
    const expenseAccounts = await ChartOfAccount.count({ where: { accountType: 'expense' } });

    res.json({
      success: true,
      data: {
        total: totalAccounts,
        assets: assetAccounts,
        liabilities: liabilityAccounts,
        equity: equityAccounts,
        revenue: revenueAccounts,
        expenses: expenseAccounts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk import chart of accounts from Excel-parsed rows (single request).
 * Two passes: create new accounts, then link parents — matches client import behavior.
 */
const bulkImportAccounts = async (req, res, next) => {
  const started = Date.now();
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include a non-empty "rows" array'
      });
    }

    const existing = await ChartOfAccount.findAll({
      attributes: ['id', 'accountCode']
    });
    const codeToIdMap = {};
    existing.forEach((a) => {
      codeToIdMap[a.accountCode] = a.id;
    });

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      const accountCode = String(row['Account Code'] || '').trim();
      const accountName = String(row['Account Name'] || '').trim();
      const accountType = String(row['Account Type'] || '')
        .trim()
        .toLowerCase();

      if (!accountCode || !accountName || !accountType) {
        skipped++;
        continue;
      }

      if (
        !['asset', 'liability', 'equity', 'revenue', 'expense'].includes(
          accountType
        )
      ) {
        skipped++;
        continue;
      }

      if (codeToIdMap[accountCode]) {
        skipped++;
        continue;
      }

      const reconcilableVal = String(row['Reconcilable'] || '')
        .trim()
        .toLowerCase();
      const taxCat = String(row['Tax Category'] || '').trim();
      const level = parseInt(String(row['Level'] || '1'), 10) || 1;
      const openingBal =
        parseFloat(String(row['Opening Balance'] || '0')) || 0;

      try {
        const account = await ChartOfAccount.create({
          accountCode,
          accountName,
          accountType,
          level,
          description: String(row['Description'] || '').trim() || null,
          taxCategory: [
            'vat_applicable',
            'vat_exempt',
            'zero_rated',
            'out_of_scope'
          ].includes(taxCat)
            ? taxCat
            : 'vat_exempt',
          isReconcilable:
            reconcilableVal === 'yes' || reconcilableVal === 'true',
          isActive: true,
          openingBalance: openingBal,
          balance: openingBal
        });

        if (account && account.id) {
          codeToIdMap[accountCode] = account.id;
        }
        created++;
      } catch (err) {
        console.error(`[bulkImportAccounts] create ${accountCode}:`, err.message);
        errors++;
      }
    }

    let parentsLinked = 0;
    let parentErrors = 0;

    for (const row of rows) {
      const accountCode = String(row['Account Code'] || '').trim();
      const parentCode = String(row['Parent Account Code'] || '').trim();

      if (!parentCode || !codeToIdMap[accountCode] || !codeToIdMap[parentCode]) {
        continue;
      }

      try {
        await ChartOfAccount.update(
          { parentAccountId: codeToIdMap[parentCode] },
          { where: { id: codeToIdMap[accountCode] } }
        );
        parentsLinked++;
      } catch (err) {
        console.error(
          `[bulkImportAccounts] parent link ${accountCode}:`,
          err.message
        );
        parentErrors++;
      }
    }

    const durationMs = Date.now() - started;
    console.log(
      `[bulkImportAccounts] rows=${rows.length} created=${created} skipped=${skipped} errors=${errors} parentsLinked=${parentsLinked} parentErrors=${parentErrors} durationMs=${durationMs}`
    );

    res.json({
      success: true,
      data: {
        created,
        skipped,
        errors,
        parentsLinked,
        parentErrors,
        durationMs
      }
    });
  } catch (error) {
    next(error);
  }
};

// Bulk update opening balances
const updateOpeningBalances = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'entries array is required and must not be empty'
      });
    }

    let updated = 0;
    for (const entry of entries) {
      const { id, openingBalance } = entry;
      if (!id || openingBalance === undefined || openingBalance === null) continue;

      const account = await ChartOfAccount.findByPk(id, { transaction: t });
      if (!account) continue;

      await account.update({
        openingBalance: parseFloat(openingBalance),
        balance: parseFloat(openingBalance)
      }, { transaction: t });

      updated++;
    }

    await t.commit();

    res.json({
      success: true,
      message: `Opening balances updated for ${updated} account(s)`,
      data: { updated }
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

module.exports = {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getAccountHierarchy,
  getAccountStats,
  bulkImportAccounts,
  updateOpeningBalances
};
