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
    const ts = timestamps;
    const cfk = companyFk;

    await queryInterface.createTable('investment_distributions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      distribution_no: { type: Sequelize.STRING(50), allowNull: false },
      distribution_date: { type: Sequelize.DATEONLY, allowNull: false },
      distribution_type: {
        type: Sequelize.ENUM('DIVIDEND', 'INTEREST', 'SELL_PROFIT'),
        allowNull: false,
      },
      investment_asset_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'investment_assets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      source_transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'investment_transactions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      bank_account_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'bank_accounts', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      posting_status: {
        type: Sequelize.ENUM('DRAFT', 'APPROVED', 'POSTED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      approval_status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      ...ts,
    });
    await queryInterface.addIndex('investment_distributions', ['company_id', 'distribution_no'], {
      unique: true,
      name: 'idx_inv_dist_company_no',
    });
    await queryInterface.addIndex('investment_distributions', ['company_id', 'source_transaction_id'], {
      unique: true,
      name: 'idx_inv_dist_source_txn',
    });

    await queryInterface.createTable('investment_distribution_lines', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: cfk,
      distribution_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'investment_distributions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      allocation_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'investment_partner_allocations', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      investor_name: { type: Sequelize.STRING(200), allowNull: false },
      investor_ref_id: { type: Sequelize.INTEGER, allowNull: true },
      share_percentage: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
      share_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      ...ts,
    });
    await queryInterface.addIndex('investment_distribution_lines', ['distribution_id'], {
      name: 'idx_inv_dist_line_dist',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_distribution_lines');
    await queryInterface.dropTable('investment_distributions');
  },
};
