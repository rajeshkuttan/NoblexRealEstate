'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add particular_type column
    await queryInterface.addColumn('accounts_trans', 'particular_type', {
      type: Sequelize.ENUM('Tenant', 'Vendor', 'Other'),
      allowNull: true,
      after: 'invoice_id'
    });

    // Add particular_id column
    await queryInterface.addColumn('accounts_trans', 'particular_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      after: 'particular_type'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('accounts_trans', 'particular_type');
    await queryInterface.removeColumn('accounts_trans', 'particular_id');
    // Note: To truly revert ENUM, we might need extra steps in some DBs, 
    // but removeColumn is usually sufficient for cleaning up the schema.
  }
};
