const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const PettyCash = sequelize.define('PettyCash', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'transaction_number',
    comment: 'Unique transaction reference'
  },
  type: {
    type: DataTypes.ENUM('replenishment', 'expense', 'adjustment', 'return'),
    allowNull: false,
    comment: 'Transaction type'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Expense category'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Transaction amount'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED',
    comment: 'Currency'
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    comment: 'Related property',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  custodian: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'User responsible for petty cash',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'approved_by',
    comment: 'User who approved',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'transaction_date',
    comment: 'Date of transaction'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Transaction description'
  },
  vendor: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Vendor/payee name'
  },
  receiptNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'receipt_number',
    comment: 'Receipt/invoice number'
  },
  receiptImage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'receipt_image',
    comment: 'Base64 encoded receipt image'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'reimbursed'),
    defaultValue: 'pending',
    comment: 'Transaction status'
  },
  chartAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'chart_account_id',
    comment: 'Link to chart of accounts',
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'card', 'mobile_payment'),
    defaultValue: 'cash',
    field: 'payment_method',
    comment: 'How payment was made'
  },
  balanceBefore: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'balance_before',
    comment: 'Balance before transaction'
  },
  balanceAfter: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'balance_after',
    comment: 'Balance after transaction'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'rejection_reason',
    comment: 'Reason for rejection'
  },
  reimburseDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reimburse_date',
    comment: 'Date of reimbursement'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created record',
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
  tableName: 'petty_cash',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_petty_cash_custodian',
      fields: ['custodian']
    },
    {
      name: 'idx_petty_cash_property',
      fields: ['property_id']
    },
    {
      name: 'idx_petty_cash_status',
      fields: ['status']
    },
    {
      name: 'idx_petty_cash_date',
      fields: ['transaction_date']
    },
    {
      name: 'idx_petty_cash_number',
      fields: ['transaction_number'],
      unique: true
    }
  ],
  comment: 'Petty cash transactions and management'
});

module.exports = PettyCash;
