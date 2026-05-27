'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = await queryInterface.describeTable('journal_vouchers');
    if (!table.property_id) {
      await queryInterface.addColumn('journal_vouchers', 'property_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'properties',
          key: 'id',
        },
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('journal_vouchers', 'property_id');
  },
};
