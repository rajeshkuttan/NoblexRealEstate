const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Payment = sequelize.define('Payment', {
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
  paymentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'payment_number'
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lease_id',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'tenant_id',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'vendor_id',
    references: {
      model: 'vendors',
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
    comment: 'Reconciliation status'
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  isPosted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_posted'
  },
  postedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'posted_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  postedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'posted_at'
  },
  transactionNo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'transaction_no'
  },
  paymentType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'payment_type'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  subcategory: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  propertyName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'property_name'
  },
  unitNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'unit_number'
  },
  payeeName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payee_name'
  },
  payeeType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'payee_type'
  },
  payeeIdString: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'payee_id_string'
  },
  instrumentNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'instrument_number'
  },
  instrumentDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'instrument_date'
  },
  pettyCashAccount: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'petty_cash_account'
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'bank_name'
  },
  processedByName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'processed_by_name'
  },
  approvedByName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'approved_by_name'
  },
  taxInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'tax_info'
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
    },
    {
      name: 'idx_payments_date',
      fields: ['payment_date']
    },
    {
      name: 'idx_payments_due',
      fields: ['due_date']
    },
    {
      name: 'idx_payments_status',
      fields: ['status']
    },
    {
      name: 'idx_payments_lease',
      fields: ['lease_id']
    },
    {
      name: 'idx_payments_tenant',
      fields: ['tenant_id']
    }
  ],
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Payment;
