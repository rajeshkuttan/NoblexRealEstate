/**
 * Migration: Enhance Chart of Accounts Table
 * Purpose: Add reconciliation, tax, property, and external system integration fields
 * Related to: FINANCE_DATABASE_ERD.md - Section 5.1
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('chart_of_accounts', 'is_reconcilable', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      field: 'is_reconcilable',
      comment: 'Flag for bank-related accounts that need reconciliation'
    });

    await queryInterface.addColumn('chart_of_accounts', 'tax_category', {
      type: Sequelize.ENUM('vat_applicable', 'vat_exempt', 'zero_rated', 'out_of_scope'),
      defaultValue: 'vat_exempt',
      field: 'tax_category',
      comment: 'Tax treatment for VAT reporting'
    });

    await queryInterface.addColumn('chart_of_accounts', 'property_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      field: 'property_id',
      comment: 'Link to specific property for property-wise accounting',
      references: {
        model: 'properties',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('chart_of_accounts', 'external_account_id', {
      type: Sequelize.STRING(50),
      allowNull: true,
      field: 'external_account_id',
      comment: 'External accounting system ID (QuickBooks, Xero)'
    });

    await queryInterface.addColumn('chart_of_accounts', 'external_system', {
      type: Sequelize.ENUM('quickbooks', 'xero', 'other'),
      allowNull: true,
      field: 'external_system',
      comment: 'External system name'
    });

    await queryInterface.addColumn('chart_of_accounts', 'sync_status', {
      type: Sequelize.ENUM('synced', 'pending', 'failed', 'not_synced'),
      defaultValue: 'not_synced',
      field: 'sync_status',
      comment: 'Sync status with external system'
    });

    await queryInterface.addColumn('chart_of_accounts', 'last_synced_at', {
      type: Sequelize.DATE,
      allowNull: true,
      field: 'last_synced_at',
      comment: 'Last successful sync timestamp'
    });

    // Add indexes for new columns
    await queryInterface.addIndex('chart_of_accounts', ['is_reconcilable'], {
      name: 'idx_coa_reconcilable'
    });

    await queryInterface.addIndex('chart_of_accounts', ['tax_category'], {
      name: 'idx_coa_tax_category'
    });

    await queryInterface.addIndex('chart_of_accounts', ['property_id'], {
      name: 'idx_coa_property_id'
    });

    await queryInterface.addIndex('chart_of_accounts', ['external_account_id'], {
      name: 'idx_coa_external_account_id'
    });

    await queryInterface.addIndex('chart_of_accounts', ['sync_status'], {
      name: 'idx_coa_sync_status'
    });

    console.log('✓ Chart of Accounts table enhanced successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('chart_of_accounts', 'idx_coa_reconcilable');
    await queryInterface.removeIndex('chart_of_accounts', 'idx_coa_tax_category');
    await queryInterface.removeIndex('chart_of_accounts', 'idx_coa_property_id');
    await queryInterface.removeIndex('chart_of_accounts', 'idx_coa_external_account_id');
    await queryInterface.removeIndex('chart_of_accounts', 'idx_coa_sync_status');

    // Remove columns
    await queryInterface.removeColumn('chart_of_accounts', 'last_synced_at');
    await queryInterface.removeColumn('chart_of_accounts', 'sync_status');
    await queryInterface.removeColumn('chart_of_accounts', 'external_system');
    await queryInterface.removeColumn('chart_of_accounts', 'external_account_id');
    await queryInterface.removeColumn('chart_of_accounts', 'property_id');
    await queryInterface.removeColumn('chart_of_accounts', 'tax_category');
    await queryInterface.removeColumn('chart_of_accounts', 'is_reconcilable');

    console.log('✓ Chart of Accounts table reverted');
  }
};

