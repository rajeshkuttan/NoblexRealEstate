const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Budget = sequelize.define('Budget', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  budgetName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'budget_name'
  },
  fiscalYear: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'fiscal_year'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'end_date'
  },
  totalBudget: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'total_budget'
  },
  spentAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'spent_amount'
  },
  remainingAmount: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'remaining_amount'
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'closed', 'archived'),
    defaultValue: 'draft'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  categoriesBackup: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'categories',
    comment: 'Legacy JSON field - being replaced by BudgetCategory table'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    comment: 'Link to specific property for property-wise budgets',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  alertThreshold: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 90,
    field: 'alert_threshold',
    comment: 'Alert when spent > threshold %'
  },
  variancePercentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0,
    field: 'variance_percentage',
    comment: 'Current variance from budget'
  },
  approvalRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'approval_required',
    comment: 'Whether budget needs approval'
  },
  alertFrequency: {
    type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'none'),
    defaultValue: 'weekly',
    field: 'alert_frequency',
    comment: 'How often to send budget alerts'
  },
  lastAlertSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_alert_sent_at',
    comment: 'Last alert timestamp'
  }
}, {
  tableName: 'budgets',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_budgets_property',
      fields: ['property_id']
    },
    {
      name: 'idx_budgets_alert_threshold',
      fields: ['alert_threshold']
    }
  ]
});

module.exports = Budget;
