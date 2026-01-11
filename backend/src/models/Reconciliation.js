const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const Reconciliation = sequelize.define('Reconciliation', {
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
  reconciliationDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'reconciliation_date',
    comment: 'Date of reconciliation'
  },
  statementBalance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'statement_balance',
    comment: 'Balance as per bank statement'
  },
  systemBalance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    field: 'system_balance',
    comment: 'Balance as per system records'
  },
  difference: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    comment: 'Difference between statement and system balance'
  },
  status: {
    type: DataTypes.ENUM('in_progress', 'completed', 'approved', 'rejected'),
    defaultValue: 'in_progress',
    comment: 'Reconciliation status'
  },
  reconciledBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reconciled_by',
    comment: 'User who performed reconciliation',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    comment: 'User who approved reconciliation',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at',
    comment: 'Approval timestamp'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Reconciliation notes and explanations'
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
  tableName: 'reconciliations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [],
  comment: 'Bank reconciliation records for treasury management'
});

module.exports = Reconciliation;
