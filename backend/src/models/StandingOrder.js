const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const StandingOrder = sequelize.define('StandingOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'order_number',
    comment: 'Unique standing order number'
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'lease_id',
    comment: 'Related lease',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant for this standing order',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  bankAccountId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'bank_account_id',
    comment: 'Bank account to receive payments',
    references: {
      model: 'bank_accounts',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Payment amount per cycle'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED',
    comment: 'Payment currency'
  },
  frequency: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'weekly', 'bi_weekly'),
    allowNull: false,
    comment: 'Payment frequency'
  },
  dayOfMonth: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'day_of_month',
    comment: 'Day of month for payment (1-31)'
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date',
    comment: 'Start date of standing order'
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date',
    comment: 'End date of standing order (null = indefinite)'
  },
  lastProcessedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_processed_date',
    comment: 'Date of last successful processing'
  },
  nextScheduledDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'next_scheduled_date',
    comment: 'Next scheduled processing date'
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'cancelled', 'completed', 'pending_approval'),
    defaultValue: 'pending_approval',
    comment: 'Standing order status'
  },
  paymentMethod: {
    type: DataTypes.ENUM('bank_transfer', 'direct_debit', 'auto_debit'),
    defaultValue: 'bank_transfer',
    field: 'payment_method',
    comment: 'Payment collection method'
  },
  mandateReference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'mandate_reference',
    comment: 'Bank mandate reference number'
  },
  mandateApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'mandate_approved_at',
    comment: 'Date when mandate was approved'
  },
  mandateApprovedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'mandate_approved_by',
    comment: 'User who approved the mandate',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  totalProcessed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_processed',
    comment: 'Total number of successful payments'
  },
  totalFailed: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'total_failed',
    comment: 'Total number of failed attempts'
  },
  lastFailureReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'last_failure_reason',
    comment: 'Reason for last failure'
  },
  retryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'retry_count',
    comment: 'Current retry count for failed payment'
  },
  maxRetries: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    field: 'max_retries',
    comment: 'Maximum retry attempts'
  },
  notifyTenant: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'notify_tenant',
    comment: 'Send notifications to tenant'
  },
  notifyDaysBefore: {
    type: DataTypes.INTEGER,
    defaultValue: 3,
    field: 'notify_days_before',
    comment: 'Days before payment to send notification'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Additional notes'
  },
  tenantBankDetails: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'tenant_bank_details',
    comment: 'Tenant bank account details'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'created_by',
    comment: 'User who created this order',
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
  tableName: 'standing_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_standing_orders_lease',
      fields: ['lease_id']
    },
    {
      name: 'idx_standing_orders_tenant',
      fields: ['tenant_id']
    },
    {
      name: 'idx_standing_orders_status',
      fields: ['status']
    },
    {
      name: 'idx_standing_orders_next_scheduled',
      fields: ['next_scheduled_date']
    }
  ],
  comment: 'Standing orders for recurring rent payments'
});

module.exports = StandingOrder;
