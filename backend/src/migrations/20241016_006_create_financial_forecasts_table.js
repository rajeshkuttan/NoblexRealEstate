/**
 * Migration: Create Financial Forecasts Table
 * Purpose: Financial Forecasting & Predictive Analytics
 * Related to: FINANCE_DATABASE_ERD.md - Section 4.6
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('financial_forecasts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      forecastName: {
        type: Sequelize.STRING(200),
        allowNull: false,
        field: 'forecast_name',
        comment: 'Forecast scenario name'
      },
      periodStart: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'period_start',
        comment: 'Forecast period start date'
      },
      periodEnd: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'period_end',
        comment: 'Forecast period end date'
      },
      forecastType: {
        type: Sequelize.ENUM('revenue', 'expenses', 'cash_flow', 'profit'),
        allowNull: false,
        field: 'forecast_type',
        comment: 'Type of forecast'
      },
      projectedRevenue: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'projected_revenue',
        comment: 'Projected revenue amount'
      },
      projectedExpenses: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'projected_expenses',
        comment: 'Projected expenses amount'
      },
      projectedProfit: {
        type: Sequelize.DECIMAL(15, 2),
        defaultValue: 0,
        field: 'projected_profit',
        comment: 'Projected profit (revenue - expenses)'
      },
      accuracyScore: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        field: 'accuracy_score',
        comment: 'Forecast accuracy score (0-100%)'
      },
      status: {
        type: Sequelize.ENUM('draft', 'active', 'completed', 'archived'),
        defaultValue: 'draft',
        comment: 'Forecast status'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Forecast methodology and notes'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'created_by',
        comment: 'User who created this forecast',
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
      comment: 'Financial forecasts and predictive analytics',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('financial_forecasts', ['forecast_name'], {
      name: 'idx_ff_forecast_name'
    });

    await queryInterface.addIndex('financial_forecasts', ['period_start'], {
      name: 'idx_ff_period_start'
    });

    await queryInterface.addIndex('financial_forecasts', ['period_end'], {
      name: 'idx_ff_period_end'
    });

    await queryInterface.addIndex('financial_forecasts', ['forecast_type'], {
      name: 'idx_ff_forecast_type'
    });

    await queryInterface.addIndex('financial_forecasts', ['status'], {
      name: 'idx_ff_status'
    });

    await queryInterface.addIndex('financial_forecasts', ['is_active'], {
      name: 'idx_ff_active'
    });

    // Composite index for time-based queries
    await queryInterface.addIndex('financial_forecasts', ['period_start', 'period_end'], {
      name: 'idx_ff_period_range'
    });

    console.log('✓ Financial Forecasts table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('financial_forecasts');
    console.log('✓ Financial Forecasts table dropped');
  }
};

