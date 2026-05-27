'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('direct_purchase_invoices');
    if (!table.payable_account_id) {
      await queryInterface.addColumn('direct_purchase_invoices', 'payable_account_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'chart_of_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  down: async (queryInterface) => {
    const table = await queryInterface.describeTable('direct_purchase_invoices');
    if (table.payable_account_id) {
      await queryInterface.removeColumn('direct_purchase_invoices', 'payable_account_id');
    }
  },
};
