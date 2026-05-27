const { Budget, User } = require('../models');
const { Op } = require('sequelize');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

// Get all budgets
const getAllBudgets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status, fiscalYear } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { ...companyWhere(req) };
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
    const budget = await assertRecordInCompany(Budget, id, req, {
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
      data: budget
    });
  } catch (error) {
    next(error);
  }
};

// Create new budget
const createBudget = async (req, res, next) => {
  try {
    const budget = await Budget.create(withCompanyId(req, req.body));
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINANCE_MASTER_CREATED,
      entityId: req.companyId,
      metadata: { resource: 'budgets', id: budget.id },
    });

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
    const updateData = withCompanyId(req, req.body);

    const budget = await assertRecordInCompany(Budget, id, req);
    await budget.update(updateData);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINANCE_MASTER_UPDATED,
      entityId: req.companyId,
      metadata: { resource: 'budgets', id: budget.id },
    });

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
    const budget = await assertRecordInCompany(Budget, id, req);

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

    const budget = await assertRecordInCompany(Budget, id, req);
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
    const scope = companyWhere(req);
    const totalBudgets = await Budget.count({ where: scope });
    const activeBudgets = await Budget.count({ where: { ...scope, status: 'active' } });
    const draftBudgets = await Budget.count({ where: { ...scope, status: 'draft' } });
    const closedBudgets = await Budget.count({ where: { ...scope, status: 'closed' } });

    // Calculate total amounts
    const totalBudgetAmount = await Budget.sum('totalBudget', { where: scope });
    const totalSpentAmount = await Budget.sum('spentAmount', { where: scope });
    const totalRemainingAmount = await Budget.sum('remainingAmount', { where: scope });

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
      where: { fiscalYear: currentYear, ...companyWhere(req) },
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
