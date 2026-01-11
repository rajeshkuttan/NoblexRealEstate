const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const BankTransaction = sequelize.define('BankTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  bankAccountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'bank_account_id',
    comment: 'Foreign key to bank_accounts',
    references: {
      model: 'bank_accounts',
      key: 'id'
    }
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'transaction_date',
    comment: 'Transaction date from bank statement'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Transaction description'
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Bank reference number'
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Transaction amount (positive for credit, negative for debit)'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED',
    comment: 'Transaction currency'
  },
  transactionType: {
    type: DataTypes.ENUM('credit', 'debit'),
    allowNull: false,
    field: 'transaction_type',
    comment: 'Transaction type'
  },
  reconciliationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reconciliation_id',
    comment: 'Link to reconciliation record if reconciled',
    references: {
      model: 'reconciliations',
      key: 'id'
    }
  },
  isReconciled: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_reconciled',
    comment: 'Reconciliation status'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    comment: 'User who imported this transaction',
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
  tableName: 'bank_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [],
  comment: 'Bank transactions imported from statements for reconciliation'
});

module.exports = BankTransaction;

