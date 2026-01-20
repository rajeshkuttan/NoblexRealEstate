'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('properties');
    
    // List of columns to add
    const columnsToAdd = [
      { name: 'type', type: Sequelize.STRING(50), allowNull: true },
      { name: 'category', type: Sequelize.STRING(100), allowNull: true },
      { name: 'year_built', type: Sequelize.INTEGER, allowNull: true },
      { name: 'floors', type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
      { name: 'total_units', type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
      { name: 'units_per_floor', type: Sequelize.INTEGER, allowNull: true, defaultValue: 1 },
      { name: 'market_value', type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      { name: 'monthly_revenue', type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      { name: 'maintenance_cost', type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      { name: 'insurance_cost', type: Sequelize.DECIMAL(15, 2), allowNull: true, defaultValue: 0 },
      { name: 'property_manager', type: Sequelize.STRING(255), allowNull: true },
      { name: 'management_company', type: Sequelize.STRING(255), allowNull: true },
      { name: 'contact_email', type: Sequelize.STRING(255), allowNull: true },
      { name: 'contact_phone', type: Sequelize.STRING(50), allowNull: true },
      { name: 'ejari_status', type: Sequelize.STRING(50), allowNull: true, defaultValue: 'pending' },
      { name: 'insurance_expiry', type: Sequelize.DATEONLY, allowNull: true },
      { name: 'last_inspection', type: Sequelize.DATEONLY, allowNull: true },
      { name: 'next_inspection', type: Sequelize.DATEONLY, allowNull: true },
      { name: 'notes', type: Sequelize.TEXT, allowNull: true }
    ];

    for (const column of columnsToAdd) {
      if (!tableInfo[column.name]) {
        await queryInterface.addColumn('properties', column.name, {
          type: column.type,
          allowNull: column.allowNull,
          defaultValue: column.defaultValue
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const columnsToRemove = [
      'type', 'category', 'year_built', 'floors', 'total_units', 'units_per_floor',
      'market_value', 'monthly_revenue', 'maintenance_cost', 'insurance_cost',
      'property_manager', 'management_company', 'contact_email', 'contact_phone',
      'ejari_status', 'insurance_expiry', 'last_inspection', 'next_inspection', 'notes'
    ];

    for (const column of columnsToRemove) {
      await queryInterface.removeColumn('properties', column);
    }
  }
};
