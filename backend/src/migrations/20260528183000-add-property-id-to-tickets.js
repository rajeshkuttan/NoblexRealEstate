'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('tickets');

    if (!table.property_id) {
      await queryInterface.addColumn('tickets', 'property_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'properties',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    const indexes = await queryInterface.showIndex('tickets');
    const hasIndex = indexes.some((index) => index.name === 'idx_tickets_property_id');
    if (!hasIndex) {
      await queryInterface.addIndex('tickets', ['property_id'], {
        name: 'idx_tickets_property_id',
      });
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('tickets');
    const hasIndex = indexes.some((index) => index.name === 'idx_tickets_property_id');
    if (hasIndex) {
      await queryInterface.removeIndex('tickets', 'idx_tickets_property_id');
    }

    const table = await queryInterface.describeTable('tickets');
    if (table.property_id) {
      await queryInterface.removeColumn('tickets', 'property_id');
    }
  },
};
