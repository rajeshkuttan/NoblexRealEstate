'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('investment_distributions', 'journal_voucher_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'journal_vouchers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('investment_distributions', 'journal_voucher_id');
  },
};
