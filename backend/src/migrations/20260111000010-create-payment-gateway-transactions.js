/**
 * Migration: Create payment_gateway_transactions table
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_gateway_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      gateway: {
        type: Sequelize.ENUM('stripe', 'paytabs', 'network'),
        allowNull: false,
        comment: 'Payment gateway provider'
      },
      transaction_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Gateway transaction/intent ID'
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Link to payment record',
        references: {
          model: 'payments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Tenant making the payment',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      lease_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Related lease',
        references: {
          model: 'leases',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Transaction amount'
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'AED',
        comment: 'Transaction currency'
      },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'),
        defaultValue: 'pending',
        comment: 'Transaction status'
      },
      payment_method: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Card brand or payment method'
      },
      card_last4: {
        type: Sequelize.STRING(4),
        allowNull: true,
        comment: 'Last 4 digits of card'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Gateway-specific metadata'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if transaction failed'
      },
      refund_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Amount refunded if applicable'
      },
      refunded_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp of refund'
      },
      webhook_received: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether webhook callback was received'
      },
      webhook_data: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Raw webhook payload'
      },
      three_d_secure: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether 3D Secure was used'
      },
      customer_email: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Customer email for receipt'
      },
      receipt_url: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Gateway receipt URL'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Soft delete flag'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Create indexes (with error handling for existing indexes)
    const indexes = [
      { fields: ['payment_id'], name: 'idx_gateway_transactions_payment' },
      { fields: ['tenant_id'], name: 'idx_gateway_transactions_tenant' },
      { fields: ['status'], name: 'idx_gateway_transactions_status' },
      { fields: ['gateway'], name: 'idx_gateway_transactions_gateway' },
      { fields: ['transaction_id'], name: 'idx_gateway_transactions_transaction_id', unique: true }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('payment_gateway_transactions', index.fields, {
          name: index.name,
          unique: index.unique || false
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) {
          throw error;
        }
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payment_gateway_transactions');
  }
};
