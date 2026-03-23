'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add contract_terminology to company_settings
    await queryInterface.addColumn('company_settings', 'contract_terminology', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'Ejari'
    });

    // Add actual_revenue to properties
    await queryInterface.addColumn('properties', 'actual_revenue', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('company_settings', 'contract_terminology');
    await queryInterface.removeColumn('properties', 'actual_revenue');
  }
};
