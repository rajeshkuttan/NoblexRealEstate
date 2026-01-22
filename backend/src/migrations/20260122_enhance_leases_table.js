'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('leases');
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!tableInfo.agency_fee) {
        await queryInterface.addColumn('leases', 'agency_fee', {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        }, { transaction });
      }

      if (!tableInfo.ejari_fee) {
        await queryInterface.addColumn('leases', 'ejari_fee', {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        }, { transaction });
      }

      if (!tableInfo.dewa_deposit) {
        await queryInterface.addColumn('leases', 'dewa_deposit', {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        }, { transaction });
      }

      if (!tableInfo.municipality_fee) {
        await queryInterface.addColumn('leases', 'municipality_fee', {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        }, { transaction });
      }

      if (!tableInfo.total_deposits) {
        await queryInterface.addColumn('leases', 'total_deposits', {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        }, { transaction });
      }

      if (!tableInfo.grace_period) {
        await queryInterface.addColumn('leases', 'grace_period', {
          type: Sequelize.INTEGER,
          defaultValue: 0
        }, { transaction });
      }

      if (!tableInfo.late_fee) {
        await queryInterface.addColumn('leases', 'late_fee', {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0
        }, { transaction });
      }

      if (!tableInfo.renewal_terms) {
        await queryInterface.addColumn('leases', 'renewal_terms', {
          type: Sequelize.TEXT,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.termination_notice) {
        await queryInterface.addColumn('leases', 'termination_notice', {
          type: Sequelize.INTEGER,
          defaultValue: 60
        }, { transaction });
      }

      if (!tableInfo.pdc_schedule) {
        await queryInterface.addColumn('leases', 'pdc_schedule', {
          type: Sequelize.JSON,
          allowNull: true
        }, { transaction });
      }

      if (!tableInfo.compliance) {
        await queryInterface.addColumn('leases', 'compliance', {
          type: Sequelize.JSON,
          allowNull: true
        }, { transaction });
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeColumn('leases', 'agency_fee', { transaction });
      await queryInterface.removeColumn('leases', 'ejari_fee', { transaction });
      await queryInterface.removeColumn('leases', 'dewa_deposit', { transaction });
      await queryInterface.removeColumn('leases', 'municipality_fee', { transaction });
      await queryInterface.removeColumn('leases', 'total_deposits', { transaction });
      await queryInterface.removeColumn('leases', 'grace_period', { transaction });
      await queryInterface.removeColumn('leases', 'late_fee', { transaction });
      await queryInterface.removeColumn('leases', 'renewal_terms', { transaction });
      await queryInterface.removeColumn('leases', 'termination_notice', { transaction });
      await queryInterface.removeColumn('leases', 'pdc_schedule', { transaction });
      await queryInterface.removeColumn('leases', 'compliance', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
