/**
 * Migration: Create Bank Transactions Table
 * Purpose: Treasury Management - Bank Statement Import & Reconciliation
 * Related to: FINANCE_DATABASE_ERD.md - Section 4.4
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bank_transactions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      bankAccountId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'bank_account_id',
        comment: 'Foreign key to bank_accounts',
        references: {
          model: 'bank_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      transactionDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'transaction_date',
        comment: 'Transaction date from bank statement'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Transaction description'
      },
      reference: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Bank reference number'
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        comment: 'Transaction amount (positive for credit, negative for debit)'
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'AED',
        comment: 'Transaction currency'
      },
      transactionType: {
        type: Sequelize.ENUM('credit', 'debit'),
        allowNull: false,
        field: 'transaction_type',
        comment: 'Transaction type'
      },
      reconciliationId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'reconciliation_id',
        comment: 'Link to reconciliation record if reconciled'
        // Foreign key will be added after reconciliations table is created
      },
      isReconciled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        field: 'is_reconciled',
        comment: 'Reconciliation status'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'created_by',
        comment: 'User who imported this transaction',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
        comment: 'Soft delete flag'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'created_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'updated_at',
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    }, {
      comment: 'Bank transactions imported from statements for reconciliation',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('bank_transactions', ['bank_account_id'], {
      name: 'idx_bt_bank_account_id'
    });

    await queryInterface.addIndex('bank_transactions', ['transaction_date'], {
      name: 'idx_bt_transaction_date'
    });

    await queryInterface.addIndex('bank_transactions', ['transaction_type'], {
      name: 'idx_bt_transaction_type'
    });

    await queryInterface.addIndex('bank_transactions', ['is_reconciled'], {
      name: 'idx_bt_reconciled'
    });

    await queryInterface.addIndex('bank_transactions', ['reconciliation_id'], {
      name: 'idx_bt_reconciliation_id'
    });

    await queryInterface.addIndex('bank_transactions', ['is_active'], {
      name: 'idx_bt_active'
    });

    // Composite index for reconciliation queries
    await queryInterface.addIndex('bank_transactions', ['bank_account_id', 'transaction_date', 'is_reconciled'], {
      name: 'idx_bt_reconciliation_query'
    });

    console.log('✓ Bank Transactions table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('bank_transactions');
    console.log('✓ Bank Transactions table dropped');
  }
};

