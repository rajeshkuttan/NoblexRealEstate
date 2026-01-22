'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('leases');
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Add property_type if it doesn't exist
      if (!tableInfo.property_type) {
        await queryInterface.addColumn('leases', 'property_type', {
          type: Sequelize.STRING(50),
          allowNull: true,
          defaultValue: 'residential'
        }, { transaction });
      }

      // Add pdc_start_date if it doesn't exist
      if (!tableInfo.pdc_start_date) {
        await queryInterface.addColumn('leases', 'pdc_start_date', {
          type: Sequelize.DATEONLY,
          allowNull: true
        }, { transaction });
      }

      // Add is_rental_taxable if it doesn't exist
      if (!tableInfo.is_rental_taxable) {
        await queryInterface.addColumn('leases', 'is_rental_taxable', {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        }, { transaction });
      }

      await transaction.commit();
      console.log('✅ Added missing columns to leases table successfully');
    } catch (err) {
      await transaction.rollback();
      console.error('❌ Migration failed:', err);
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('leases', 'property_type', { transaction });
      await queryInterface.removeColumn('leases', 'pdc_start_date', { transaction });
      await queryInterface.removeColumn('leases', 'is_rental_taxable', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
