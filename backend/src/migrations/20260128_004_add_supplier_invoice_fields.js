/**
 * Migration: Add Supplier Invoice Number and Date to Purchase Invoices
 * Purpose: Capture vendor's invoice number and date
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('purchase_invoices', 'supplier_invoice_number', {
      type: Sequelize.STRING(100),
      allowNull: true,
      comment: 'Invoice number from supplier/vendor'
    });

    await queryInterface.addColumn('purchase_invoices', 'supplier_invoice_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Invoice date from supplier/vendor'
    });

    // Add index for supplier invoice number for easier lookup
    await queryInterface.addIndex('purchase_invoices', ['supplier_invoice_number'], {
      name: 'idx_pi_supplier_invoice_number'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('purchase_invoices', 'idx_pi_supplier_invoice_number');
    await queryInterface.removeColumn('purchase_invoices', 'supplier_invoice_date');
    await queryInterface.removeColumn('purchase_invoices', 'supplier_invoice_number');
  }
};
