'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add account_id column to service_templates table
    await queryInterface.addColumn('service_templates', 'account_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'chart_of_accounts',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index on account_id
    await queryInterface.addIndex('service_templates', ['account_id'], {
      name: 'idx_service_templates_account_id'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('service_templates', 'idx_service_templates_account_id');
    await queryInterface.removeColumn('service_templates', 'account_id');
  }
};
