'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('petty_cash', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      transaction_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      type: { type: Sequelize.ENUM('replenishment', 'expense', 'adjustment', 'return'), allowNull: false },
      category: { type: Sequelize.STRING(100), allowNull: true },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), defaultValue: 'AED' },
      property_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'properties', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      custodian: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      transaction_date: { type: Sequelize.DATE, allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      vendor: { type: Sequelize.STRING(200), allowNull: true },
      receipt_number: { type: Sequelize.STRING(100), allowNull: true },
      receipt_image: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('pending', 'approved', 'rejected', 'reimbursed'), defaultValue: 'pending' },
      chart_account_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'chart_of_accounts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      payment_method: { type: Sequelize.ENUM('cash', 'card', 'mobile_payment'), defaultValue: 'cash' },
      balance_before: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      balance_after: { type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
      notes: { type: Sequelize.TEXT, allowNull: true },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      reimburse_date: { type: Sequelize.DATE, allowNull: true },
      created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    // Create indexes (with error handling for existing indexes)
    const indexes = [
      { fields: ['custodian'], name: 'idx_petty_cash_custodian' },
      { fields: ['property_id'], name: 'idx_petty_cash_property' },
      { fields: ['status'], name: 'idx_petty_cash_status' },
      { fields: ['transaction_date'], name: 'idx_petty_cash_date' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('petty_cash', index.fields, { name: index.name });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('petty_cash');
  }
};
