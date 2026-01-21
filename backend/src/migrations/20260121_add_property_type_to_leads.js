'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('leads', 'property_type', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'residential'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('leads', 'property_type');
  }
};
