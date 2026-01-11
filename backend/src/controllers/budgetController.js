const { Budget, User } = require('../models');
const { Op } = require('sequelize');

// Get all budgets
const getAllBudgets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, fiscalYear } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { budgetName: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    if (status) whereClause.status = status;
    if (fiscalYear) whereClause.fiscalYear = fiscalYear;

    const budgets = await Budget.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      include: [
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
        budgets: budgets.rows,
        pagination: {
          total: budgets.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(budgets.count / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get budget by ID
const getBudgetById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByPk(id, {
      include: [
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

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// Create new budget
const createBudget = async (req, res, next) => {
  try {
    const budgetData = req.body;
    const budget = await Budget.create(budgetData);

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// Update budget
const updateBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const budget = await Budget.findByPk(id);
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    await budget.update(updateData);

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// Delete budget
const deleteBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const budget = await Budget.findByPk(id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    await budget.destroy();

    res.json({
      success: true,
      message: 'Budget deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Approve budget
const approveBudget = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const budget = await Budget.findByPk(id);
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    await budget.update({
      status: 'active',
      approvedBy,
      approvedAt: new Date()
    });

    res.json({
      success: true,
      message: 'Budget approved successfully',
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// Get budget statistics
const getBudgetStats = async (req, res, next) => {
  try {
    const totalBudgets = await Budget.count();
    const activeBudgets = await Budget.count({ where: { status: 'active' } });
    const draftBudgets = await Budget.count({ where: { status: 'draft' } });
    const closedBudgets = await Budget.count({ where: { status: 'closed' } });

    // Calculate total amounts
    const totalBudgetAmount = await Budget.sum('totalBudget');
    const totalSpentAmount = await Budget.sum('spentAmount');
    const totalRemainingAmount = await Budget.sum('remainingAmount');

    res.json({
      success: true,
      data: {
        counts: {
          total: totalBudgets,
          active: activeBudgets,
          draft: draftBudgets,
          closed: closedBudgets
        },
        amounts: {
          totalBudget: totalBudgetAmount || 0,
          totalSpent: totalSpentAmount || 0,
          totalRemaining: totalRemainingAmount || 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current year budgets
const getCurrentYearBudgets = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    
    const budgets = await Budget.findAll({
      where: { fiscalYear: currentYear },
      include: [
        {
          model: User,
          as: 'creator'
        },
        {
          model: User,
          as: 'approver'
        }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: budgets
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllBudgets,
  getBudgetById,
  createBudget,
  updateBudget,
  deleteBudget,
  approveBudget,
  getBudgetStats,
  getCurrentYearBudgets
};
