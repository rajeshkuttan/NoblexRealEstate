/**
 * Migration: Create payment_reminders table
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payment_reminders', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      payment_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Related payment',
        references: {
          model: 'payments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      tenant_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Tenant to remind',
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
      reminder_type: {
        type: Sequelize.ENUM('before_due', 'on_due', 'after_due', 'escalation'),
        allowNull: false,
        comment: 'Type of reminder'
      },
      method: {
        type: Sequelize.ENUM('email', 'sms', 'whatsapp', 'all'),
        defaultValue: 'email',
        comment: 'Communication method'
      },
      scheduled_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When reminder should be sent'
      },
      sent_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When reminder was actually sent'
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'failed', 'cancelled'),
        defaultValue: 'pending',
        comment: 'Reminder status'
      },
      email_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Email notification sent'
      },
      sms_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'SMS notification sent'
      },
      whatsapp_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'WhatsApp notification sent'
      },
      email_message_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Email service message ID'
      },
      sms_message_id: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'SMS service message ID'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error details if failed'
      },
      retry_count: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Number of retry attempts'
      },
      max_retries: {
        type: Sequelize.INTEGER,
        defaultValue: 3,
        comment: 'Maximum retry attempts'
      },
      escalation_level: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        comment: 'Escalation level'
      },
      response_received: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether tenant responded'
      },
      response_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When tenant responded'
      },
      response_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Tenant response notes'
      },
      template_used: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Template identifier used'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata'
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
      { fields: ['payment_id'], name: 'idx_payment_reminders_payment' },
      { fields: ['tenant_id'], name: 'idx_payment_reminders_tenant' },
      { fields: ['status'], name: 'idx_payment_reminders_status' },
      { fields: ['scheduled_date'], name: 'idx_payment_reminders_scheduled' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('payment_reminders', index.fields, { name: index.name });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payment_reminders');
  }
};
