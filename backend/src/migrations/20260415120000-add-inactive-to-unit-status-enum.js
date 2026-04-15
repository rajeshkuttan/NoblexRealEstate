/**
 * Migration: Add 'inactive' to units.status ENUM (MySQL)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('units', 'status', {
      type: Sequelize.ENUM(
        'available',
        'occupied',
        'maintenance',
        'reserved',
        'dispute',
        'npa',
        'case',
        'inactive'
      ),
      defaultValue: 'available',
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('units', 'status', {
      type: Sequelize.ENUM(
        'available',
        'occupied',
        'maintenance',
        'reserved',
        'dispute',
        'npa',
        'case'
      ),
      defaultValue: 'available',
    });
  },
};
