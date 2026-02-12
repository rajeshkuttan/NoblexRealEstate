'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('chart_of_accounts', 'opening_balance', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('chart_of_accounts', 'opening_balance');
  }
};
