const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const BankAccount = sequelize.define('BankAccount', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'company_id',
    references: { model: 'company_settings', key: 'id' },
  },
  bankName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'bank_name',
    comment: 'Name of the bank'
  },
  accountName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'account_name',
    comment: 'Account holder name'
  },
  accountNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'account_number',
    comment: 'Bank account number'
  },
  iban: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'International Bank Account Number'
  },
  swiftCode: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'swift_code',
    comment: 'SWIFT/BIC code'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED',
    comment: 'Account currency (ISO code)'
  },
  currentBalance: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'current_balance',
    comment: 'Current balance as per last reconciliation'
  },
  chartAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'chart_account_id',
    comment: 'Link to Chart of Accounts',
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'closed'),
    defaultValue: 'active',
    comment: 'Account status'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created this account',
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
  tableName: 'bank_accounts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [],
  comment: 'Bank accounts for treasury management'
});

module.exports = BankAccount;
