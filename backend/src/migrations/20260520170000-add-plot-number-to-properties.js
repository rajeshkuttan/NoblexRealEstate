'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('properties');
    if (!table.plot_number) {
      await queryInterface.addColumn('properties', 'plot_number', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('properties', 'plot_number');
  },
};
