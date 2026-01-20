'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('units');
    
    // Add missing columns to units table
    if (!tableInfo.category) {
      await queryInterface.addColumn('units', 'category', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Unit category like Studio, 1BR, 2BR, etc.'
      });
    }

    if (!tableInfo.market_value) {
      await queryInterface.addColumn('units', 'market_value', {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Estimated market value of the unit'
      });
    }

    if (!tableInfo.features) {
      await queryInterface.addColumn('units', 'features', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of features like Dishwasher, AC, etc.'
      });
    }

    if (!tableInfo.orientation) {
      await queryInterface.addColumn('units', 'orientation', {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Unit orientation like North, South, East, West'
      });
    }

    if (!tableInfo.energy_rating) {
      await queryInterface.addColumn('units', 'energy_rating', {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'Energy efficiency rating like A+, A, B, C'
      });
    }

    if (!tableInfo.last_renovation) {
      await queryInterface.addColumn('units', 'last_renovation', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Year or date of last renovation'
      });
    }

    if (!tableInfo.virtual_tour) {
      await queryInterface.addColumn('units', 'virtual_tour', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether unit has virtual tour available'
      });
    }

    if (!tableInfo.smoking_allowed) {
      await queryInterface.addColumn('units', 'smoking_allowed', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        comment: 'Whether smoking is allowed in the unit'
      });
    }

    if (!tableInfo.documents) {
      await queryInterface.addColumn('units', 'documents', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of document types associated with the unit'
      });
    }

    console.log('✅ Added missing columns to units table');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the columns in reverse order
    await queryInterface.removeColumn('units', 'documents');
    await queryInterface.removeColumn('units', 'smoking_allowed');
    await queryInterface.removeColumn('units', 'virtual_tour');
    await queryInterface.removeColumn('units', 'last_renovation');
    await queryInterface.removeColumn('units', 'energy_rating');
    await queryInterface.removeColumn('units', 'orientation');
    await queryInterface.removeColumn('units', 'features');
    await queryInterface.removeColumn('units', 'market_value');
    await queryInterface.removeColumn('units', 'category');

    console.log('✅ Removed 9 columns from units table');
  }
};
