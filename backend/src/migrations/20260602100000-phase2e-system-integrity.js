'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_integrity_audits', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      run_id: { type: Sequelize.STRING(36), allowNull: false },
      audit_type: { type: Sequelize.STRING(80), allowNull: false },
      severity: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        allowNull: false,
        defaultValue: 'MEDIUM',
      },
      record_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      details_json: { type: Sequelize.JSON, allowNull: true },
      status: {
        type: Sequelize.ENUM('running', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'completed',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('system_integrity_audits', ['run_id'], {
      name: 'idx_system_integrity_audits_run_id',
    });
    await queryInterface.addIndex('system_integrity_audits', ['audit_type', 'created_at'], {
      name: 'idx_system_integrity_audits_type_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_integrity_audits');
  },
};
