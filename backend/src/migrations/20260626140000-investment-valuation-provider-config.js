'use strict';

const companyFk = {
  type: require('sequelize').INTEGER,
  allowNull: false,
  references: { model: 'company_settings', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'RESTRICT',
};

const timestamps = {
  created_at: { type: require('sequelize').DATE, allowNull: false, defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP') },
  updated_at: {
    type: require('sequelize').DATE,
    allowNull: false,
    defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
  },
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('investment_valuation_provider_configs', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: companyFk,
      provider_name: { type: Sequelize.STRING(100), allowNull: false, defaultValue: 'manual' },
      enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      api_key_env_var: { type: Sequelize.STRING(100), allowNull: true },
      supported_asset_classes: { type: Sequelize.JSON, allowNull: true },
      refresh_frequency_minutes: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1440 },
      last_run_at: { type: Sequelize.DATE, allowNull: true },
      last_status: { type: Sequelize.STRING(255), allowNull: true },
      ...timestamps,
    });
    await queryInterface.addIndex('investment_valuation_provider_configs', ['company_id'], {
      unique: true,
      name: 'idx_inv_val_provider_company',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_valuation_provider_configs');
  },
};
