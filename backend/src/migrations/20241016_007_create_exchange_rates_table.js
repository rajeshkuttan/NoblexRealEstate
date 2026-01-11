/**
 * Migration: Create Exchange Rates Table
 * Purpose: Multi-Currency Support - Exchange Rate Management
 * Related to: FINANCE_DATABASE_ERD.md - Section 4.7
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('exchange_rates', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      fromCurrency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        field: 'from_currency',
        comment: 'Source currency (ISO code)'
      },
      toCurrency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        field: 'to_currency',
        comment: 'Target currency (ISO code)'
      },
      rate: {
        type: Sequelize.DECIMAL(15, 6),
        allowNull: false,
        comment: 'Exchange rate (1 from_currency = rate * to_currency)'
      },
      effectiveDate: {
        type: Sequelize.DATE,
        allowNull: false,
        field: 'effective_date',
        comment: 'Date when this rate becomes effective'
      },
      source: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'manual',
        comment: 'Source of exchange rate (manual, api, central_bank)'
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
        field: 'created_by',
        comment: 'User who created this rate',
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
      comment: 'Exchange rates for multi-currency transactions',
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci'
    });

    // Add indexes
    await queryInterface.addIndex('exchange_rates', ['from_currency'], {
      name: 'idx_er_from_currency'
    });

    await queryInterface.addIndex('exchange_rates', ['to_currency'], {
      name: 'idx_er_to_currency'
    });

    await queryInterface.addIndex('exchange_rates', ['effective_date'], {
      name: 'idx_er_effective_date'
    });

    await queryInterface.addIndex('exchange_rates', ['is_active'], {
      name: 'idx_er_active'
    });

    // Composite index for currency pair lookup
    await queryInterface.addIndex('exchange_rates', ['from_currency', 'to_currency', 'effective_date'], {
      name: 'idx_er_currency_pair_date'
    });

    // Unique constraint for currency pair on effective date
    await queryInterface.addIndex('exchange_rates', ['from_currency', 'to_currency', 'effective_date'], {
      name: 'idx_er_unique_rate',
      unique: true
    });

    console.log('✓ Exchange Rates table created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('exchange_rates');
    console.log('✓ Exchange Rates table dropped');
  }
};

