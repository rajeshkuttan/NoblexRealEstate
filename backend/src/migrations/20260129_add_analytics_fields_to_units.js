'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('units');
    
    if (!tableInfo.roi) {
      await queryInterface.addColumn('units', 'roi', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Return on Investment percentage'
      });
    }

    if (!tableInfo.tenant_satisfaction) {
      await queryInterface.addColumn('units', 'tenant_satisfaction', {
        type: Sequelize.DECIMAL(3, 1),
        allowNull: true,
        defaultValue: 0,
        comment: 'Tenant satisfaction rating (0-5)'
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('units');

    if (tableInfo.roi) {
      await queryInterface.removeColumn('units', 'roi');
    }
    
    if (tableInfo.tenant_satisfaction) {
      await queryInterface.removeColumn('units', 'tenant_satisfaction');
    }
  }
};
