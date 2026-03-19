/**
 * Migration: Fix Unit status ENUM
 * Purpose: Ensure 'npa' and 'case' statuses are available in the database
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // MySQL-specific way to update ENUM
    // Note: changeColumn for ENUM in MySQL can be flaky with Sequelize, 
    // but we'll try the standard way first. If it fails, manual SQL is needed.
    await queryInterface.changeColumn('units', 'status', {
      type: Sequelize.ENUM('available', 'occupied', 'maintenance', 'reserved', 'dispute', 'npa', 'case'),
      defaultValue: 'available'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert to what it was before this fix (just adding back the 'dispute' but removing others might lose data!)
    // For safety in dev, we just keep it as is or revert to previous known state
    await queryInterface.changeColumn('units', 'status', {
      type: Sequelize.ENUM('available', 'occupied', 'maintenance', 'reserved', 'dispute'),
      defaultValue: 'available'
    });
  }
};
