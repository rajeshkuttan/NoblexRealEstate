'use strict';

/**
 * users.role was ENUM(limited system keys). Dynamic RBAC roles use keys aligned with roles.key (VARCHAR).
 * Storing any other value caused MySQL "Data truncated for column 'role' at row 1".
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'mysql' || dialect === 'mariadb') {
      await queryInterface.sequelize.query(
        "ALTER TABLE `users` MODIFY COLUMN `role` VARCHAR(120) NOT NULL DEFAULT 'agent'",
      );
    } else {
      await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.STRING(120),
        allowNull: false,
        defaultValue: 'agent',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    if (queryInterface.sequelize.getDialect() === 'mysql' || queryInterface.sequelize.getDialect() === 'mariadb') {
      await queryInterface.sequelize.query(
        "ALTER TABLE `users` MODIFY COLUMN `role` ENUM(" +
          "'admin','agent','manager','finance_manager','finance_executive','operations_executive','maintenance_contractor','tenant','viewer'" +
          ") NOT NULL DEFAULT 'agent'",
      );
    } else {
      await queryInterface.changeColumn('users', 'role', {
        type: Sequelize.ENUM(
          'admin',
          'agent',
          'manager',
          'finance_manager',
          'finance_executive',
          'operations_executive',
          'maintenance_contractor',
          'tenant',
          'viewer',
        ),
        defaultValue: 'agent',
      });
    }
  },
};
