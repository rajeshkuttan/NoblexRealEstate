/**
 * Migration: Enhance Invoices Table
 * Purpose: Add vendor invoice and purchase order references
 * Related to: FINANCE_DATABASE_ERD.md - Section 5.4
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new columns
    await queryInterface.addColumn('invoices', 'vendor_invoice_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'vendor_invoice_number',
      comment: 'Vendor invoice reference (for reimbursements)'
    });

    await queryInterface.addColumn('invoices', 'purchase_order_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      field: 'purchase_order_number',
      comment: 'Purchase order reference'
    });

    // Add indexes for new columns
    await queryInterface.addIndex('invoices', ['vendor_invoice_number'], {
      name: 'idx_invoice_vendor_invoice_number'
    });

    await queryInterface.addIndex('invoices', ['purchase_order_number'], {
      name: 'idx_invoice_purchase_order_number'
    });

    console.log('✓ Invoices table enhanced successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes
    await queryInterface.removeIndex('invoices', 'idx_invoice_vendor_invoice_number');
    await queryInterface.removeIndex('invoices', 'idx_invoice_purchase_order_number');

    // Remove columns
    await queryInterface.removeColumn('invoices', 'purchase_order_number');
    await queryInterface.removeColumn('invoices', 'vendor_invoice_number');

    console.log('✓ Invoices table reverted');
  }
};

