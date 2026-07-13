'use strict';

const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, DECIMAL, ENUM, literal } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('investment_valuation_batches', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      valuation_number: { type: STRING(50), allowNull: false },
      valuation_date: { type: DATEONLY, allowNull: false },
      valuation_type: { type: STRING(50), allowNull: false, defaultValue: 'MARK_TO_MARKET' },
      source_type: { type: STRING(50), allowNull: false, defaultValue: 'MANUAL' },
      status: {
        type: ENUM('DRAFT', 'IMPORTED', 'VALIDATED', 'EXCEPTION', 'APPROVED', 'POSTED', 'LOCKED', 'REVERSED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      total_cost: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      total_market_value: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      total_unrealized_gain_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      exception_count: { type: INTEGER, allowNull: false, defaultValue: 0 },
      created_by: { type: INTEGER, allowNull: true },
      approved_by: { type: INTEGER, allowNull: true },
      posted_at: { type: DATE, allowNull: true },
      locked_at: { type: DATE, allowNull: true },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_valuation_batch_lines', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      batch_id: { type: INTEGER, allowNull: false },
      instrument_id: { type: INTEGER, allowNull: false },
      holding_v2_id: { type: INTEGER, allowNull: true },
      quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      cost: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      price: { type: DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      prior_price: { type: DECIMAL(15, 4), allowNull: true },
      market_value: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      unrealized_gain_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      price_source: { type: STRING(50), allowNull: true },
      exception_code: { type: STRING(50), allowNull: true },
      exception_message: { type: TEXT, allowNull: true },
      status: {
        type: ENUM('OK', 'WARNING', 'EXCEPTION', 'FIXED'),
        allowNull: false,
        defaultValue: 'OK',
      },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_market_prices', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      instrument_id: { type: INTEGER, allowNull: false },
      price_date: { type: DATEONLY, allowNull: false },
      price_type: { type: STRING(30), allowNull: false, defaultValue: 'CLOSE' },
      bid: { type: DECIMAL(15, 4), allowNull: true },
      ask: { type: DECIMAL(15, 4), allowNull: true },
      close: { type: DECIMAL(15, 4), allowNull: true },
      mid: { type: DECIMAL(15, 4), allowNull: true },
      nav: { type: DECIMAL(15, 4), allowNull: true },
      source: { type: STRING(50), allowNull: false, defaultValue: 'MANUAL' },
      source_priority: { type: INTEGER, allowNull: false, defaultValue: 100 },
      currency_code: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      confidence_score: { type: DECIMAL(8, 4), allowNull: true },
      stale_flag: { type: BOOLEAN, allowNull: false, defaultValue: false },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_benchmarks', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      code: { type: STRING(50), allowNull: false },
      name: { type: STRING(255), allowNull: false },
      provider: { type: STRING(100), allowNull: true },
      currency: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      return_series_json: { type: TEXT, allowNull: true },
      status: { type: ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_nav_snapshots', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      investor_id: { type: INTEGER, allowNull: true },
      nav_date: { type: DATEONLY, allowNull: false },
      market_value: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      cash: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      receivables: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      accrued_income: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      payables: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      fees: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      liabilities: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      nav: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      units: { type: DECIMAL(18, 6), allowNull: true },
      nav_per_unit: { type: DECIMAL(15, 6), allowNull: true },
      valuation_batch_id: { type: INTEGER, allowNull: true },
      status: { type: ENUM('DRAFT', 'FINAL', 'LOCKED'), allowNull: false, defaultValue: 'DRAFT' },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_performance_periods', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      period_start: { type: DATEONLY, allowNull: false },
      period_end: { type: DATEONLY, allowNull: false },
      opening_value: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      closing_value: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      external_flows: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      income: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      realized_gain_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      unrealized_gain_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      twr: { type: DECIMAL(18, 10), allowNull: true },
      mwr: { type: DECIMAL(18, 10), allowNull: true },
      irr: { type: DECIMAL(18, 10), allowNull: true },
      absolute_return: { type: DECIMAL(18, 10), allowNull: true },
      annualized_return: { type: DECIMAL(18, 10), allowNull: true },
      benchmark_return: { type: DECIMAL(18, 10), allowNull: true },
      excess_return: { type: DECIMAL(18, 10), allowNull: true },
      volatility: { type: DECIMAL(18, 10), allowNull: true },
      max_drawdown: { type: DECIMAL(18, 10), allowNull: true },
      sharpe_ratio: { type: DECIMAL(18, 10), allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('investment_valuation_batches', ['company_id', 'valuation_number'], {
      name: 'idx_inv_val_batch_number',
    });
    await queryInterface.addIndex('investment_market_prices', ['company_id', 'instrument_id', 'price_date', 'source'], {
      name: 'idx_inv_mkt_price_lookup',
    });
    await queryInterface.addIndex('investment_nav_snapshots', ['company_id', 'portfolio_id', 'nav_date'], {
      name: 'idx_inv_nav_snap',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_performance_periods');
    await queryInterface.dropTable('investment_nav_snapshots');
    await queryInterface.dropTable('investment_benchmarks');
    await queryInterface.dropTable('investment_market_prices');
    await queryInterface.dropTable('investment_valuation_batch_lines');
    await queryInterface.dropTable('investment_valuation_batches');
  },
};
