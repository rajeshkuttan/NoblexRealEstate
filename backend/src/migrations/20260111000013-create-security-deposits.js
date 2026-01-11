/**
 * Migration: Create security_deposits table
 */

'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('security_deposits', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      deposit_number: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique deposit reference number'
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
        comment: 'Tenant who paid the deposit',
        references: {
          model: 'tenants',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      property_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Related property',
        references: {
          model: 'properties',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      bank_account_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Bank account holding the deposit',
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
        comment: 'Deposit amount'
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'AED',
        comment: 'Deposit currency'
      },
      deposit_date: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Date when deposit was received'
      },
      release_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date when deposit was released'
      },
      status: {
        type: Sequelize.ENUM('held', 'released', 'partially_released', 'forfeited', 'transferred'),
        defaultValue: 'held',
        comment: 'Deposit status'
      },
      release_amount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Amount released to tenant'
      },
      deduction_amount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Amount deducted for damages/rent'
      },
      deduction_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reason for deductions'
      },
      interest_rate: {
        type: Sequelize.DECIMAL(5, 2),
        defaultValue: 0,
        comment: 'Annual interest rate (if applicable)'
      },
      accrued_interest: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Interest accrued on deposit'
      },
      payment_method: {
        type: Sequelize.ENUM('cash', 'cheque', 'bank_transfer', 'online'),
        defaultValue: 'cheque',
        comment: 'How deposit was paid'
      },
      cheque_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Link to cheque if paid by cheque',
        references: {
          model: 'cheques',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      release_method: {
        type: Sequelize.ENUM('cash', 'cheque', 'bank_transfer', 'online'),
        allowNull: true,
        comment: 'How deposit will be/was released'
      },
      release_reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Reference for release transaction'
      },
      inspection_required: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        comment: 'Whether inspection is required before release'
      },
      inspection_date: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Date of property inspection'
      },
      inspection_status: {
        type: Sequelize.ENUM('pending', 'scheduled', 'completed', 'failed'),
        allowNull: true,
        comment: 'Inspection status'
      },
      inspection_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Notes from inspection'
      },
      inspected_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User who conducted inspection',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      documents: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Related documents'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
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
      released_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User who released the deposit',
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
      { fields: ['lease_id'], name: 'idx_security_deposits_lease' },
      { fields: ['tenant_id'], name: 'idx_security_deposits_tenant' },
      { fields: ['property_id'], name: 'idx_security_deposits_property' },
      { fields: ['status'], name: 'idx_security_deposits_status' },
      { fields: ['deposit_number'], name: 'idx_security_deposits_number', unique: true }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('security_deposits', index.fields, {
          name: index.name,
          unique: index.unique || false
        });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('security_deposits');
  }
};
