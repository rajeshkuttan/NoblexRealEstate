'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('credit_limits', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      tenant_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'tenants', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      credit_limit: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      current_balance: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      available_credit: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      currency: { type: Sequelize.STRING(3), defaultValue: 'AED' },
      credit_score: { type: Sequelize.INTEGER, defaultValue: 0 },
      risk_level: { type: Sequelize.ENUM('low', 'medium', 'high', 'critical'), defaultValue: 'medium' },
      payment_terms_days: { type: Sequelize.INTEGER, defaultValue: 30 },
      overdue_amount: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      days_overdue: { type: Sequelize.INTEGER, defaultValue: 0 },
      collection_stage: { type: Sequelize.ENUM('none', 'reminder', 'warning', 'final_notice', 'legal', 'write_off'), defaultValue: 'none' },
      last_collection_date: { type: Sequelize.DATE, allowNull: true },
      collection_notes: { type: Sequelize.TEXT, allowNull: true },
      credit_hold: { type: Sequelize.BOOLEAN, defaultValue: false },
      credit_hold_reason: { type: Sequelize.TEXT, allowNull: true },
      last_review_date: { type: Sequelize.DATE, allowNull: true },
      next_review_date: { type: Sequelize.DATE, allowNull: true },
      approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    const indexes = [
      { fields: ['tenant_id'], name: 'idx_credit_limits_tenant', unique: true },
      { fields: ['risk_level'], name: 'idx_credit_limits_risk' },
      { fields: ['collection_stage'], name: 'idx_credit_limits_collection' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('credit_limits', index.fields, { name: index.name, unique: index.unique || false });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('credit_limits');
  }
};
