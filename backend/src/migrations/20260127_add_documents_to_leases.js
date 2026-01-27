'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('leases');
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!tableInfo.documents) {
        await queryInterface.addColumn('leases', 'documents', {
          type: Sequelize.JSON,
          allowNull: true
        }, { transaction });
      }

      await transaction.commit();
      console.log('✅ Added documents column to leases table successfully');
    } catch (err) {
      await transaction.rollback();
      console.error('❌ Migration failed:', err);
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('leases', 'documents', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
