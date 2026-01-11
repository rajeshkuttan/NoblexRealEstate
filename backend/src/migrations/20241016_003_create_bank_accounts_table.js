/**
 * Migration: Create Bank Accounts Table
 * Purpose: Treasury Management - Bank Account Management
 * Related to: FINANCE_DATABASE_ERD.md - Section 4.3
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bank_accounts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      bankName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'bank_name',
        comment: 'Name of the bank'
      },
      accountName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'account_name',
        comment: 'Account holder name'
      },
      accountNumber: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        field: 'account_number',
        comment: 'Bank account number'
      },
      iban: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'International Bank Account Number'
      },
      swiftCode: {
        type: Sequelize.STRING(20),
        allowNull: true,
        field: 'swift_code',
        comment: 'SWIFT/BIC code'
      },
      currency: {
        type: Sequelize.STRING(3),
        defaultValue: 'AED',
        comment: 'Account currency (ISO code)'
      },
      currentBalance: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'current_balance',
        comment: 'Current balance as per last reconciliation'
      },
      chartAccountId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'chart_account_id',
        comment: 'Link to Chart of Accounts',
        references: {
          model: 'chart_of_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'closed'),
        defaultValue: 'active',
        comment: 'Account status'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'created_by',
        comment: 'User who created this account',
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
      comment: 'Bank accounts for treasury management',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('bank_accounts', ['account_number'], {
      name: 'idx_ba_account_number'
    });

    await queryInterface.addIndex('bank_accounts', ['iban'], {
      name: 'idx_ba_iban'
    });

    await queryInterface.addIndex('bank_accounts', ['bank_name'], {
      name: 'idx_ba_bank_name'
    });

    await queryInterface.addIndex('bank_accounts', ['status'], {
      name: 'idx_ba_status'
    });

    await queryInterface.addIndex('bank_accounts', ['chart_account_id'], {
      name: 'idx_ba_chart_account_id'
    });

    await queryInterface.addIndex('bank_accounts', ['is_active'], {
      name: 'idx_ba_active'
    });

    console.log('✓ Bank Accounts table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('bank_accounts');
    console.log('✓ Bank Accounts table dropped');
  }
};

