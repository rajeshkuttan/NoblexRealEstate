const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'payment_number'
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lease_id',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'payment_date'
  },
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'due_date'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'bank_transfer', 'cheque', 'credit_card', 'debit_card', 'online'),
    allowNull: false,
    field: 'payment_method'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled', 'refunded'),
    defaultValue: 'pending'
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  lateFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'late_fee'
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receiptNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'receipt_number'
  },
  bankDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'bank_details'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  bankTransactionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'bank_transaction_id',
    comment: 'Link to bank transaction if from statement',
    references: {
      model: 'bank_transactions',
      key: 'id'
    }
  },
  reconciliationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reconciliation_id',
    comment: 'Link to reconciliation record',
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
  }
}, {
  tableName: 'payments',
  timestamps: true,
  indexes: [
    {
      name: 'idx_payments_bank_transaction',
      fields: ['bank_transaction_id']
    },
    {
      name: 'idx_payments_reconciliation',
      fields: ['reconciliation_id']
    },
    {
      name: 'idx_payments_reconciled',
      fields: ['is_reconciled']
    }
  ],
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Payment;
