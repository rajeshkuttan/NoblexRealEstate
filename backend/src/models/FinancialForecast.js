const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialForecast = sequelize.define('FinancialForecast', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  forecastName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'forecast_name',
    comment: 'Forecast scenario name'
  },
  periodStart: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'period_start',
    comment: 'Forecast period start date'
  },
  periodEnd: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'period_end',
    comment: 'Forecast period end date'
  },
  forecastType: {
    type: DataTypes.ENUM('revenue', 'expenses', 'cash_flow', 'profit'),
    allowNull: false,
    field: 'forecast_type',
    comment: 'Type of forecast'
  },
  projectedRevenue: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'projected_revenue',
    comment: 'Projected revenue amount'
  },
  projectedExpenses: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'projected_expenses',
    comment: 'Projected expenses amount'
  },
  projectedProfit: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'projected_profit',
    comment: 'Projected profit (revenue - expenses)'
  },
  accuracyScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    field: 'accuracy_score',
    comment: 'Forecast accuracy score (0-100%)'
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed', 'archived'),
    defaultValue: 'draft',
    comment: 'Forecast status'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Forecast methodology and notes'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created this forecast',
    references: {
      model: 'users',
      key: 'id'
    }
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
  tableName: 'financial_forecasts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [],
  comment: 'Financial forecasts and predictive analytics'
});

module.exports = FinancialForecast;
