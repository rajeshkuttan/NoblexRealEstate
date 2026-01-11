const { DataTypes, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentGatewayTransaction = sequelize.define('PaymentGatewayTransaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gateway: {
    type: DataTypes.ENUM('stripe', 'paytabs', 'network'),
    allowNull: false,
    comment: 'Payment gateway provider'
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    field: 'transaction_id',
    comment: 'Gateway transaction/intent ID'
  },
  paymentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'payment_id',
    comment: 'Link to payment record',
    references: {
      model: 'payments',
      key: 'id'
    }
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'tenant_id',
    comment: 'Tenant making the payment',
    references: {
      model: 'tenants',
      key: 'id'
    }
  },
  leaseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'lease_id',
    comment: 'Related lease',
    references: {
      model: 'leases',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    comment: 'Transaction amount'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'AED',
    comment: 'Transaction currency'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'),
    defaultValue: 'pending',
    comment: 'Transaction status'
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'payment_method',
    comment: 'Card brand or payment method (visa, mastercard, etc.)'
  },
  cardLast4: {
    type: DataTypes.STRING(4),
    allowNull: true,
    field: 'card_last4',
    comment: 'Last 4 digits of card'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Gateway-specific metadata'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
    comment: 'Error details if transaction failed'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
    field: 'refund_amount',
    comment: 'Amount refunded if applicable'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'refunded_at',
    comment: 'Timestamp of refund'
  },
  webhookReceived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'webhook_received',
    comment: 'Whether webhook callback was received'
  },
  webhookData: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'webhook_data',
    comment: 'Raw webhook payload'
  },
  threeDSecure: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'three_d_secure',
    comment: 'Whether 3D Secure was used'
  },
  customerEmail: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'customer_email',
    comment: 'Customer email for receipt'
  },
  receiptUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'receipt_url',
    comment: 'Gateway receipt URL'
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
  tableName: 'payment_gateway_transactions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_gateway_transactions_payment',
      fields: ['payment_id']
    },
    {
      name: 'idx_gateway_transactions_tenant',
      fields: ['tenant_id']
    },
    {
      name: 'idx_gateway_transactions_status',
      fields: ['status']
    },
    {
      name: 'idx_gateway_transactions_gateway',
      fields: ['gateway']
    }
  ],
  comment: 'Payment gateway transactions tracking'
});

module.exports = PaymentGatewayTransaction;
