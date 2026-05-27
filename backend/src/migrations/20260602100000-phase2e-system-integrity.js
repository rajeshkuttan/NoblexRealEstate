'use strict';

async function tableExists(queryInterface, name) {
  const tables = await queryInterface.showAllTables();
  const list = Array.isArray(tables)
    ? tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.TABLE_NAME))
    : [];
  return list.includes(name);
}

async function indexExists(queryInterface, tableName, indexName) {
  try {
    const indexes = await queryInterface.showIndex(tableName);
    return indexes.some((idx) => idx.name === indexName || idx.Key_name === indexName);
  } catch {
    return false;
  }
}

async function addIndexIfMissing(queryInterface, table, fields, options) {
  if (!(await indexExists(queryInterface, table, options.name))) {
    await queryInterface.addIndex(table, fields, options);
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'system_integrity_audits'))) {
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
    }
    await addIndexIfMissing(queryInterface, 'system_integrity_audits', ['run_id'], {
      name: 'idx_system_integrity_audits_run_id',
    });
    await addIndexIfMissing(queryInterface, 'system_integrity_audits', ['audit_type', 'created_at'], {
      name: 'idx_system_integrity_audits_type_created',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_integrity_audits');
  },
};
