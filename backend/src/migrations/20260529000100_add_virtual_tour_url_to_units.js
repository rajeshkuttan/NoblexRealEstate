'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('units');

    if (!tableInfo.virtual_tour_url) {
      await queryInterface.addColumn('units', 'virtual_tour_url', {
        type: Sequelize.STRING(1000),
        allowNull: true,
        comment: 'External URL for the unit virtual tour',
      });
    }
  },

  async down(queryInterface) {
    const tableInfo = await queryInterface.describeTable('units');

    if (tableInfo.virtual_tour_url) {
      await queryInterface.removeColumn('units', 'virtual_tour_url');
    }
  },
};
