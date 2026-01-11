const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const ExchangeRate = sequelize.define('ExchangeRate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  fromCurrency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    field: 'from_currency',
    comment: 'Source currency (ISO code)'
  },
  toCurrency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    field: 'to_currency',
    comment: 'Target currency (ISO code)'
  },
  rate: {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    comment: 'Exchange rate (1 from_currency = rate * to_currency)'
  },
  effectiveDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'effective_date',
    comment: 'Date when this rate becomes effective'
  },
  source: {
    type: DataTypes.STRING(50),
    defaultValue: 'manual',
    comment: 'Source of exchange rate (manual, api, central_bank)'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created this rate',
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
  tableName: 'exchange_rates',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [],
  comment: 'Exchange rates for multi-currency transactions'
});

module.exports = ExchangeRate;
