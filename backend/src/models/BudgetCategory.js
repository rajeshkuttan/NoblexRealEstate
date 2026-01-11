const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const BudgetCategory = sequelize.define('BudgetCategory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  budgetId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'budget_id',
    comment: 'Foreign key to budgets table',
    references: {
      model: 'budgets',
      key: 'id'
    }
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'account_id',
    comment: 'Link to chart of accounts',
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  categoryName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'category_name',
    comment: 'Budget category name'
  },
  budgetedAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'budgeted_amount',
    comment: 'Budgeted amount for this category'
  },
  spentAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'spent_amount',
    comment: 'Amount spent in this category'
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'remaining_amount',
    comment: 'Remaining budget (budgeted - spent)'
  },
  variance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Budget variance (negative if over budget)'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Category-specific notes'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
    comment: 'Soft delete flag'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at',
    defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
  }
}, {
  tableName: 'budget_categories',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [],
  comment: 'Budget categories for detailed budget management'
});

module.exports = BudgetCategory;
