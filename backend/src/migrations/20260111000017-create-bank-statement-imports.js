'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bank_statement_imports', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      bank_account_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'bank_accounts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      file_name: { type: Sequelize.STRING(255), allowNull: false },
      file_type: { type: Sequelize.ENUM('csv', 'xlsx', 'pdf', 'ofx', 'qif'), allowNull: false },
      file_size: { type: Sequelize.INTEGER },
      statement_period_start: { type: Sequelize.DATE },
      statement_period_end: { type: Sequelize.DATE },
      total_transactions: { type: Sequelize.INTEGER, defaultValue: 0 },
      imported_transactions: { type: Sequelize.INTEGER, defaultValue: 0 },
      duplicate_transactions: { type: Sequelize.INTEGER, defaultValue: 0 },
      failed_transactions: { type: Sequelize.INTEGER, defaultValue: 0 },
      status: { type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'partially_completed'), defaultValue: 'pending' },
      error_log: { type: Sequelize.TEXT },
      imported_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      imported_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      processed_at: { type: Sequelize.DATE },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    const indexes = [
      { fields: ['bank_account_id'], name: 'idx_bank_statement_imports_account' },
      { fields: ['status'], name: 'idx_bank_statement_imports_status' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('bank_statement_imports', index.fields, { name: index.name });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) throw error;
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('bank_statement_imports');
  }
};
