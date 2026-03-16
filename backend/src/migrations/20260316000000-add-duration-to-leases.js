'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('leases', 'duration', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 12,
      after: 'end_date'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('leases', 'duration');
  }
};
