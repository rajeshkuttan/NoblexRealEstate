'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('tenants');
    if (!table.trade_license_number) {
      await queryInterface.addColumn('tenants', 'trade_license_number', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('tenants', 'trade_license_number');
  },
};
