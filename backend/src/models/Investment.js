const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const Investment = sequelize.define('Investment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  investmentNumber: { type: DataTypes.STRING(50), allowNull: false, unique: true, field: 'investment_number' },
  bankAccountId: { type: DataTypes.INTEGER, field: 'bank_account_id', references: { model: 'bank_accounts', key: 'id' } },
  investmentType: { type: DataTypes.ENUM('term_deposit', 'fixed_deposit', 'savings', 'treasury_bill', 'bond'), allowNull: false, field: 'investment_type' },
  principalAmount: { type: DataTypes.DECIMAL(15, 2), allowNull: false, field: 'principal_amount' },
  currency: { type: DataTypes.STRING(3), defaultValue: 'AED' },
  interestRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, field: 'interest_rate' },
  term: { type: DataTypes.INTEGER, comment: 'Term in months' },
  startDate: { type: DataTypes.DATE, allowNull: false, field: 'start_date' },
  maturityDate: { type: DataTypes.DATE, allowNull: false, field: 'maturity_date' },
  currentValue: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'current_value' },
  accruedInterest: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0, field: 'accrued_interest' },
  status: { type: DataTypes.ENUM('active', 'matured', 'redeemed', 'rolled_over'), defaultValue: 'active' },
  autoRollover: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'auto_rollover' },
  notes: { type: DataTypes.TEXT },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  createdAt: { type: DataTypes.DATE, allowNull: false, field: 'created_at', defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  updatedAt: { type: DataTypes.DATE, allowNull: false, field: 'updated_at', defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
}, {
  tableName: 'investments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ name: 'idx_investments_bank_account', fields: ['bank_account_id'] }, { name: 'idx_investments_status', fields: ['status'] }]
});

module.exports = Investment;
