const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialTransaction = sequelize.define('FinancialTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  transactionNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'transaction_number'
  },
  transactionDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'transaction_date'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED'
  },
  transactionType: {
    type: DataTypes.ENUM('debit', 'credit'),
    allowNull: false,
    field: 'transaction_type'
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'account_id',
    references: {
      model: 'chart_of_accounts',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.ENUM('rent', 'deposit', 'maintenance', 'utilities', 'insurance', 'tax', 'other'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'reversed'),
    defaultValue: 'pending'
  },
  paymentMethod: {
    type: DataTypes.ENUM('cash', 'bank_transfer', 'cheque', 'credit_card', 'debit_card', 'online'),
    allowNull: true,
    field: 'payment_method'
  },
  bankDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'bank_details'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  vendorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'vendor_id',
    comment: 'Link to vendor for expense transactions',
    references: {
      model: 'vendors',
      key: 'id'
    }
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'property_id',
    comment: 'Link to property for property-wise tracking',
    references: {
      model: 'properties',
      key: 'id'
    }
  },
  reconciliationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'reconciliation_id',
    comment: 'Link to reconciliation if from bank statement',
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
  exchangeRateId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'exchange_rate_id',
    comment: 'Link to exchange rate for multi-currency',
    references: {
      model: 'exchange_rates',
      key: 'id'
    }
  },
  foreignAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'foreign_amount',
    comment: 'Amount in foreign currency'
  },
  exchangeGainLoss: {
    type: DataTypes.DECIMAL(15, 2),
    defaultValue: 0,
    field: 'exchange_gain_loss',
    comment: 'Exchange gain or loss on conversion'
  }
}, {
  tableName: 'financial_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_ft_vendor',
      fields: ['vendor_id']
    },
    {
      name: 'idx_ft_property',
      fields: ['property_id']
    },
    {
      name: 'idx_ft_reconciliation',
      fields: ['reconciliation_id']
    },
    {
      name: 'idx_ft_reconciled',
      fields: ['is_reconciled']
    },
    {
      name: 'idx_ft_exchange_rate',
      fields: ['exchange_rate_id']
    },
    {
      name: 'idx_ft_vendor_date',
      fields: ['vendor_id', 'transaction_date']
    },
    {
      name: 'idx_ft_property_date',
      fields: ['property_id', 'transaction_date']
    }
  ]
});

module.exports = FinancialTransaction;
