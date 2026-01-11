/**
 * Migration: Create Budget Categories Table
 * Purpose: Advanced Budget Management - Category-wise Budgeting
 * Related to: FINANCE_DATABASE_ERD.md - Section 4.8
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('budget_categories', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      budgetId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'budget_id',
        comment: 'Foreign key to budgets table',
        references: {
          model: 'budgets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      accountId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        field: 'account_id',
        comment: 'Link to chart of accounts',
        references: {
          model: 'chart_of_accounts',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      categoryName: {
        type: Sequelize.STRING(100),
        allowNull: false,
        field: 'category_name',
        comment: 'Budget category name'
      },
      budgetedAmount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'budgeted_amount',
        comment: 'Budgeted amount for this category'
      },
      spentAmount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'spent_amount',
        comment: 'Amount spent in this category'
      },
      remainingAmount: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'remaining_amount',
        comment: 'Remaining budget (budgeted - spent)'
      },
      variance: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        comment: 'Budget variance (negative if over budget)'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Category-specific notes'
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
      comment: 'Budget categories for detailed budget management',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('budget_categories', ['budget_id'], {
      name: 'idx_bc_budget_id'
    });

    await queryInterface.addIndex('budget_categories', ['account_id'], {
      name: 'idx_bc_account_id'
    });

    await queryInterface.addIndex('budget_categories', ['category_name'], {
      name: 'idx_bc_category_name'
    });

    await queryInterface.addIndex('budget_categories', ['is_active'], {
      name: 'idx_bc_active'
    });

    // Composite index for budget analysis
    await queryInterface.addIndex('budget_categories', ['budget_id', 'account_id'], {
      name: 'idx_bc_budget_account'
    });

    console.log('✓ Budget Categories table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('budget_categories');
    console.log('✓ Budget Categories table dropped');
  }
};

