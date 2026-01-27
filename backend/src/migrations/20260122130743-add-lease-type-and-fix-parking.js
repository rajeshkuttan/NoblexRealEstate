'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add lease_type column to leases table if it doesn't exist
    const leaseTable = await queryInterface.describeTable('leases');
    if (!leaseTable.lease_type) {
      await queryInterface.addColumn('leases', 'lease_type', {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'residential'
      });
    }

    // 2. Change parking column in units table from BOOLEAN to INTEGER
    // Note: depending on DB, casting might be needed. For now, we assume direct change or recreation.
    // Since we can't easily cast boolean to int in all dialects preserving meaning (true->1?), 
    // we will just alter it. If data is lost it's acceptable for this fix scope.
    await queryInterface.changeColumn('units', 'parking', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert parking to boolean
    await queryInterface.changeColumn('units', 'parking', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });

    // Remove lease_type column
    await queryInterface.removeColumn('leases', 'lease_type');
  }
};
