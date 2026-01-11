'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('investments', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      investment_number: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      bank_account_id: { type: Sequelize.INTEGER, references: { model: 'bank_accounts', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      investment_type: { type: Sequelize.ENUM('term_deposit', 'fixed_deposit', 'savings', 'treasury_bill', 'bond'), allowNull: false },
      principal_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      currency: { type: Sequelize.STRING(3), defaultValue: 'AED' },
      interest_rate: { type: Sequelize.DECIMAL(5, 2), allowNull: false },
      term: { type: Sequelize.INTEGER },
      start_date: { type: Sequelize.DATE, allowNull: false },
      maturity_date: { type: Sequelize.DATE, allowNull: false },
      current_value: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      accrued_interest: { type: Sequelize.DECIMAL(15, 2), defaultValue: 0 },
      status: { type: Sequelize.ENUM('active', 'matured', 'redeemed', 'rolled_over'), defaultValue: 'active' },
      auto_rollover: { type: Sequelize.BOOLEAN, defaultValue: false },
      notes: { type: Sequelize.TEXT },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
    });

    const indexes = [
      { fields: ['bank_account_id'], name: 'idx_investments_bank_account' },
      { fields: ['status'], name: 'idx_investments_status' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.addIndex('investments', index.fields, { name: index.name });
      } catch (error) {
        if (!error.message.includes('Duplicate key name')) throw error;
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investments');
  }
};
