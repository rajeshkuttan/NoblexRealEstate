'use strict';

const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, DECIMAL, ENUM, JSON, literal } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('investment_brokers', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      broker_code: { type: STRING(50), allowNull: false },
      broker_name: { type: STRING(255), allowNull: false },
      contact_email: { type: STRING(255), allowNull: true },
      contact_phone: { type: STRING(50), allowNull: true },
      country_code: { type: STRING(10), allowNull: true },
      status: { type: ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      deleted_at: { type: DATE, allowNull: true },
    });

    await queryInterface.createTable('investment_custodians', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      custodian_code: { type: STRING(50), allowNull: false },
      custodian_name: { type: STRING(255), allowNull: false },
      contact_email: { type: STRING(255), allowNull: true },
      contact_phone: { type: STRING(50), allowNull: true },
      country_code: { type: STRING(10), allowNull: true },
      status: { type: ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      deleted_at: { type: DATE, allowNull: true },
    });

    await queryInterface.createTable('investment_portfolios', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_code: { type: STRING(50), allowNull: false },
      portfolio_name: { type: STRING(255), allowNull: false },
      reporting_currency: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      base_currency: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      portfolio_type: { type: STRING(50), allowNull: true, defaultValue: 'GENERAL' },
      risk_profile: { type: ENUM('LOW', 'MEDIUM', 'HIGH'), allowNull: false, defaultValue: 'MEDIUM' },
      inception_date: { type: DATEONLY, allowNull: true },
      close_date: { type: DATEONLY, allowNull: true },
      status: { type: ENUM('ACTIVE', 'CLOSED', 'DRAFT'), allowNull: false, defaultValue: 'ACTIVE' },
      manager_user_id: { type: INTEGER, allowNull: true },
      custodian_id: { type: INTEGER, allowNull: true },
      default_broker_id: { type: INTEGER, allowNull: true },
      default_bank_account_id: { type: INTEGER, allowNull: true },
      accounting_method: { type: STRING(50), allowNull: true, defaultValue: 'COST' },
      cost_basis_method: { type: STRING(50), allowNull: true, defaultValue: 'AVERAGE' },
      description: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      deleted_at: { type: DATE, allowNull: true },
    });

    await queryInterface.createTable('investment_books', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      book_code: { type: STRING(50), allowNull: false },
      book_name: { type: STRING(255), allowNull: false },
      book_type: { type: STRING(50), allowNull: true, defaultValue: 'TRADING' },
      accounting_basis: { type: STRING(50), allowNull: true, defaultValue: 'COST' },
      reporting_currency: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      active_from: { type: DATEONLY, allowNull: true },
      active_to: { type: DATEONLY, allowNull: true },
      status: { type: ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('investment_instruments', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      instrument_code: { type: STRING(50), allowNull: false },
      instrument_name: { type: STRING(255), allowNull: false },
      short_name: { type: STRING(100), allowNull: true },
      asset_class: { type: STRING(100), allowNull: true },
      instrument_type: { type: STRING(100), allowNull: true },
      isin: { type: STRING(50), allowNull: true },
      ticker: { type: STRING(50), allowNull: true },
      exchange: { type: STRING(100), allowNull: true },
      issuer_name: { type: STRING(255), allowNull: true },
      country_code: { type: STRING(10), allowNull: true },
      sector_code: { type: STRING(50), allowNull: true },
      currency_code: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      face_value: { type: DECIMAL(18, 6), allowNull: true },
      coupon_rate: { type: DECIMAL(12, 6), allowNull: true },
      maturity_date: { type: DATEONLY, allowNull: true },
      status: { type: ENUM('ACTIVE', 'INACTIVE', 'MATURED', 'DELISTED'), allowNull: false, defaultValue: 'ACTIVE' },
      legacy_asset_id: { type: INTEGER, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      deleted_at: { type: DATE, allowNull: true },
    });

    await queryInterface.createTable('investment_instrument_attributes', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      instrument_id: { type: INTEGER, allowNull: false },
      attr_key: { type: STRING(100), allowNull: false },
      attr_value: { type: TEXT, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('investment_accounts', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      account_code: { type: STRING(50), allowNull: false },
      account_name: { type: STRING(255), allowNull: false },
      account_type: { type: STRING(50), allowNull: true, defaultValue: 'BROKERAGE' },
      broker_id: { type: INTEGER, allowNull: true },
      custodian_id: { type: INTEGER, allowNull: true },
      bank_account_id: { type: INTEGER, allowNull: true },
      currency_code: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      status: { type: ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
      deleted_at: { type: DATE, allowNull: true },
    });

    await queryInterface.createTable('investment_holdings_v2', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      book_id: { type: INTEGER, allowNull: false },
      instrument_id: { type: INTEGER, allowNull: false },
      legacy_asset_id: { type: INTEGER, allowNull: true },
      quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      average_cost: { type: DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      total_cost: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      current_price: { type: DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      current_market_value: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      base_currency_value: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      unrealized_gain_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      realized_gain_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      last_valuation_date: { type: DATEONLY, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    await queryInterface.createTable('investment_position_lots', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      holding_v2_id: { type: INTEGER, allowNull: false },
      lot_ref: { type: STRING(50), allowNull: true },
      open_date: { type: DATEONLY, allowNull: true },
      quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      remaining_quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      unit_cost: { type: DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      total_cost: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: { type: ENUM('OPEN', 'CLOSED'), allowNull: false, defaultValue: 'OPEN' },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    await queryInterface.addIndex('investment_portfolios', ['company_id', 'portfolio_code'], {
      name: 'idx_inv_portfolios_company_code',
    });
    await queryInterface.addIndex('investment_instruments', ['company_id', 'instrument_code'], {
      name: 'idx_inv_instruments_company_code',
    });
    await queryInterface.addIndex('investment_holdings_v2', ['company_id', 'portfolio_id', 'instrument_id'], {
      name: 'idx_inv_holdings_v2_portfolio_instrument',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_position_lots');
    await queryInterface.dropTable('investment_holdings_v2');
    await queryInterface.dropTable('investment_accounts');
    await queryInterface.dropTable('investment_instrument_attributes');
    await queryInterface.dropTable('investment_instruments');
    await queryInterface.dropTable('investment_books');
    await queryInterface.dropTable('investment_portfolios');
    await queryInterface.dropTable('investment_custodians');
    await queryInterface.dropTable('investment_brokers');
  },
};
