/**
 * Migration: Create Reconciliations Table
 * Purpose: Treasury Management - Bank Reconciliation Tracking
 * Related to: FINANCE_DATABASE_ERD.md - Section 4.5
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('reconciliations', {
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
      reconciliationDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'reconciliation_date',
        comment: 'Date of reconciliation'
      },
      statementBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'statement_balance',
        comment: 'Balance as per bank statement'
      },
      systemBalance: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        field: 'system_balance',
        comment: 'Balance as per system records'
      },
      difference: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Difference between statement and system balance'
      },
      status: {
        type: Sequelize.ENUM('in_progress', 'completed', 'approved', 'rejected'),
        defaultValue: 'in_progress',
        comment: 'Reconciliation status'
      },
      reconciledBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'reconciled_by',
        comment: 'User who performed reconciliation',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approvedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'approved_by',
        comment: 'User who approved reconciliation',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approvedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        field: 'approved_at',
        comment: 'Approval timestamp'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Reconciliation notes and explanations'
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
      comment: 'Bank reconciliation records for treasury management',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('reconciliations', ['bank_account_id'], {
      name: 'idx_rec_bank_account_id'
    });

    await queryInterface.addIndex('reconciliations', ['reconciliation_date'], {
      name: 'idx_rec_reconciliation_date'
    });

    await queryInterface.addIndex('reconciliations', ['status'], {
      name: 'idx_rec_status'
    });

    await queryInterface.addIndex('reconciliations', ['reconciled_by'], {
      name: 'idx_rec_reconciled_by'
    });

    await queryInterface.addIndex('reconciliations', ['is_active'], {
      name: 'idx_rec_active'
    });

    // Composite index for queries
    await queryInterface.addIndex('reconciliations', ['bank_account_id', 'reconciliation_date'], {
      name: 'idx_rec_account_date'
    });

    console.log('✓ Reconciliations table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('reconciliations');
    console.log('✓ Reconciliations table dropped');
  }
};

