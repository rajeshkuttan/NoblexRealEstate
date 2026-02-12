'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('purchase_invoices', 'discount_type', {
      type: Sequelize.ENUM('percentage', 'amount'),
      allowNull: true,
      defaultValue: 'amount',
      comment: 'Type of global discount'
    });

    await queryInterface.addColumn('purchase_invoices', 'discount_value', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Value of global discount'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('purchase_invoices', 'discount_type');
    await queryInterface.removeColumn('purchase_invoices', 'discount_value');
  }
};
