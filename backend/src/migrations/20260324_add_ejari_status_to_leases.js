'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('leases');
    
    if (!tableInfo.ejari_status) {
      await queryInterface.addColumn('leases', 'ejari_status', {
        type: Sequelize.ENUM('registered', 'pending', 'expired', 'not_required'),
        defaultValue: 'pending',
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('leases', 'ejari_status');
  }
};
