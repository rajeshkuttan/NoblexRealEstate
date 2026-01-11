/**
 * Migration: Create standing_orders table
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('standing_orders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      order_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique standing order number'
      },
      lease_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Related lease',
        references: {
          model: 'leases',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Tenant for this standing order',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      bank_account_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Bank account to receive payments',
        references: {
          model: 'bank_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Payment amount per cycle'
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'AED',
        comment: 'Payment currency'
      },
      frequency: {
        type: Sequelize.ENUM('monthly', 'quarterly', 'semi_annual', 'annual', 'weekly', 'bi_weekly'),
        allowNull: false,
        comment: 'Payment frequency'
      },
      day_of_month: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Day of month for payment (1-31)'
      },
      start_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Start date of standing order'
      },
      end_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'End date of standing order (null = indefinite)'
      },
      last_processed_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date of last successful processing'
      },
      next_scheduled_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Next scheduled processing date'
      },
      status: {
        type: Sequelize.ENUM('active', 'paused', 'cancelled', 'completed', 'pending_approval'),
        defaultValue: 'pending_approval',
        comment: 'Standing order status'
      },
      payment_method: {
        type: Sequelize.ENUM('bank_transfer', 'direct_debit', 'auto_debit'),
        defaultValue: 'bank_transfer',
        comment: 'Payment collection method'
      },
      mandate_reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Bank mandate reference number'
      },
      mandate_approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when mandate was approved'
      },
      mandate_approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User who approved the mandate',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      total_processed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total number of successful payments'
      },
      total_failed: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Total number of failed attempts'
      },
      last_failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for last failure'
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Current retry count for failed payment'
      },
      max_retries: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
        comment: 'Maximum retry attempts'
      },
      notify_tenant: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Send notifications to tenant'
      },
      notify_days_before: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
        comment: 'Days before payment to send notification'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
      },
      tenant_bank_details: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Tenant bank account details'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User who created this order',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
      { fields: ['lease_id'], name: 'idx_standing_orders_lease' },
      { fields: ['tenant_id'], name: 'idx_standing_orders_tenant' },
      { fields: ['status'], name: 'idx_standing_orders_status' },
      { fields: ['next_scheduled_date'], name: 'idx_standing_orders_next_scheduled' },
      { fields: ['order_number'], name: 'idx_standing_orders_number', unique: true }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('standing_orders', index.fields, {
          name: index.name,
          unique: index.unique || false
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('standing_orders');
  }
};
