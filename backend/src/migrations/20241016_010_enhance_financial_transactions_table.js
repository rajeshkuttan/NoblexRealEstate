/**
 * Migration: Enhance Financial Transactions Table
 * Purpose: Add vendor, property, reconciliation, and multi-currency support
 * Related to: FINANCE_DATABASE_ERD.md - Section 5.2
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('financial_transactions', 'vendor_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'vendor_id',
      comment: 'Link to vendor for expense transactions',
      references: {
        model: 'vendors',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('financial_transactions', 'property_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'property_id',
      comment: 'Link to property for property-wise tracking',
      references: {
        model: 'properties',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('financial_transactions', 'reconciliation_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'reconciliation_id',
      comment: 'Link to reconciliation if from bank statement',
      references: {
        model: 'reconciliations',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('financial_transactions', 'is_reconciled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_reconciled',
      comment: 'Reconciliation status'
    });

    await queryInterface.addColumn('financial_transactions', 'exchange_rate_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'exchange_rate_id',
      comment: 'Link to exchange rate for multi-currency',
      references: {
        model: 'exchange_rates',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('financial_transactions', 'foreign_amount', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      field: 'foreign_amount',
      comment: 'Amount in foreign currency'
    });

    await queryInterface.addColumn('financial_transactions', 'exchange_gain_loss', {
      type: Sequelize.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'exchange_gain_loss',
      comment: 'Exchange gain or loss on conversion'
    });

    // Add indexes for new columns
    await queryInterface.addIndex('financial_transactions', ['vendor_id'], {
      name: 'idx_ft_vendor_id'
    });

    await queryInterface.addIndex('financial_transactions', ['property_id'], {
      name: 'idx_ft_property_id'
    });

    await queryInterface.addIndex('financial_transactions', ['reconciliation_id'], {
      name: 'idx_ft_reconciliation_id'
    });

    await queryInterface.addIndex('financial_transactions', ['is_reconciled'], {
      name: 'idx_ft_reconciled'
    });

    await queryInterface.addIndex('financial_transactions', ['exchange_rate_id'], {
      name: 'idx_ft_exchange_rate_id'
    });

    // Composite index for property-wise reporting
    await queryInterface.addIndex('financial_transactions', ['property_id', 'transaction_date'], {
      name: 'idx_ft_property_date'
    });

    // Composite index for vendor analysis
    await queryInterface.addIndex('financial_transactions', ['vendor_id', 'transaction_date'], {
      name: 'idx_ft_vendor_date'
    });

    console.log('✓ Financial Transactions table enhanced successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('financial_transactions', 'idx_ft_vendor_id');
    await queryInterface.removeIndex('financial_transactions', 'idx_ft_property_id');
    await queryInterface.removeIndex('financial_transactions', 'idx_ft_reconciliation_id');
    await queryInterface.removeIndex('financial_transactions', 'idx_ft_reconciled');
    await queryInterface.removeIndex('financial_transactions', 'idx_ft_exchange_rate_id');
    await queryInterface.removeIndex('financial_transactions', 'idx_ft_property_date');
    await queryInterface.removeIndex('financial_transactions', 'idx_ft_vendor_date');

    // Remove columns
    await queryInterface.removeColumn('financial_transactions', 'exchange_gain_loss');
    await queryInterface.removeColumn('financial_transactions', 'foreign_amount');
    await queryInterface.removeColumn('financial_transactions', 'exchange_rate_id');
    await queryInterface.removeColumn('financial_transactions', 'is_reconciled');
    await queryInterface.removeColumn('financial_transactions', 'reconciliation_id');
    await queryInterface.removeColumn('financial_transactions', 'property_id');
    await queryInterface.removeColumn('financial_transactions', 'vendor_id');

    console.log('✓ Financial Transactions table reverted');
  }
};

