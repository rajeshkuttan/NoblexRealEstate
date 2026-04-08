/**
 * Migration: Create cheques table
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cheques', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      cheque_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Cheque number'
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
        comment: 'Tenant who issued the cheque',
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
      bank_account_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Company bank account for deposit',
        references: {
          model: 'bank_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Issuing bank name'
      },
      branch_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Bank branch'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Cheque amount'
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'AED',
        comment: 'Cheque currency'
      },
      cheque_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Date on the cheque (for PDC tracking)'
      },
      deposit_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when cheque was deposited'
      },
      clearance_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when cheque cleared'
      },
      bounced_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when cheque bounced'
      },
      status: {
        type: Sequelize.ENUM('pending', 'received', 'deposited', 'cleared', 'bounced', 'cancelled', 'replaced'),
        defaultValue: 'pending',
        comment: 'Cheque status'
      },
      cheque_type: {
        type: Sequelize.ENUM('pdc', 'current', 'security_deposit'),
        defaultValue: 'current',
        comment: 'Type of cheque'
      },
      bounce_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for bounce'
      },
      bounce_fee: {
        type: Sequelize.DECIMAL(10, 2),
        defaultValue: 0,
        comment: 'Fee charged for bounced cheque'
      },
      replacement_cheque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Link to replacement cheque',
        references: {
          model: 'cheques',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      original_cheque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Link to original cheque',
        references: {
          model: 'cheques',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      scanned_image: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Base64 encoded scanned image'
      },
      bank_reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Bank reference number'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
      },
      reminder_sent: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether reminder was sent'
      },
      reminder_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When reminder was sent'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'User who created this record',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      deposited_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User who deposited the cheque',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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
      { fields: ['payment_id'], name: 'idx_cheques_payment' },
      { fields: ['tenant_id'], name: 'idx_cheques_tenant' },
      { fields: ['lease_id'], name: 'idx_cheques_lease' },
      { fields: ['status'], name: 'idx_cheques_status' },
      { fields: ['cheque_date'], name: 'idx_cheques_cheque_date' },
      { fields: ['cheque_number', 'bank_name'], name: 'idx_cheques_number' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('cheques', index.fields, { name: index.name });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('cheques');
  }
};
