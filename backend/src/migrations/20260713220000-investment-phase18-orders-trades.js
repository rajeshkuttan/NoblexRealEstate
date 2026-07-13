'use strict';

const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, DECIMAL, ENUM, literal } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('investment_orders', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      instrument_id: { type: INTEGER, allowNull: false },
      order_number: { type: STRING(50), allowNull: false },
      order_type: { type: STRING(30), allowNull: false, defaultValue: 'MARKET' },
      side: { type: ENUM('BUY', 'SELL'), allowNull: false },
      quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      executed_quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      limit_price: { type: DECIMAL(15, 4), allowNull: true },
      stop_price: { type: DECIMAL(15, 4), allowNull: true },
      currency_code: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      order_date: { type: DATEONLY, allowNull: false },
      expiry_date: { type: DATEONLY, allowNull: true },
      broker_id: { type: INTEGER, allowNull: true },
      account_id: { type: INTEGER, allowNull: true },
      settlement_instructions: { type: TEXT, allowNull: true },
      status: {
        type: ENUM(
          'DRAFT',
          'SUBMITTED',
          'APPROVED',
          'REJECTED',
          'PLACED',
          'PARTIALLY_EXECUTED',
          'EXECUTED',
          'EXPIRED',
          'CANCELLED'
        ),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      submitted_by: { type: INTEGER, allowNull: true },
      approved_by: { type: INTEGER, allowNull: true },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_trades', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      order_id: { type: INTEGER, allowNull: true },
      instrument_id: { type: INTEGER, allowNull: false },
      holding_v2_id: { type: INTEGER, allowNull: true },
      trade_number: { type: STRING(50), allowNull: false },
      broker_reference: { type: STRING(100), allowNull: true },
      side: { type: ENUM('BUY', 'SELL'), allowNull: false },
      trade_date: { type: DATEONLY, allowNull: false },
      settlement_date: { type: DATEONLY, allowNull: true },
      quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      price: { type: DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      gross_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      accrued_interest: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      commission: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      fees: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      taxes: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      withholding_tax: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      exchange_rate: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 1 },
      net_settlement: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      realized_gain_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      cost_basis_method: { type: STRING(30), allowNull: false, defaultValue: 'AVERAGE' },
      broker_id: { type: INTEGER, allowNull: true },
      custodian_id: { type: INTEGER, allowNull: true },
      investment_account_id: { type: INTEGER, allowNull: true },
      bank_account_id: { type: INTEGER, allowNull: true },
      accounting_policy: {
        type: ENUM('TRADE_DATE', 'SETTLEMENT_DATE'),
        allowNull: false,
        defaultValue: 'TRADE_DATE',
      },
      status: {
        type: ENUM('DRAFT', 'CONFIRMED', 'SETTLED', 'CANCELLED', 'FAILED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      legacy_transaction_id: { type: INTEGER, allowNull: true },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_settlements', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      trade_id: { type: INTEGER, allowNull: false },
      settlement_number: { type: STRING(50), allowNull: false },
      expected_date: { type: DATEONLY, allowNull: true },
      actual_date: { type: DATEONLY, allowNull: true },
      settlement_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      settlement_currency: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      bank_account_id: { type: INTEGER, allowNull: true },
      status: {
        type: ENUM('PENDING', 'PARTIALLY_SETTLED', 'SETTLED', 'FAILED', 'REVERSED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      failure_reason: { type: TEXT, allowNull: true },
      external_reference: { type: STRING(100), allowNull: true },
      reconciled_at: { type: DATE, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_trade_lot_allocations', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      trade_id: { type: INTEGER, allowNull: false },
      lot_id: { type: INTEGER, allowNull: false },
      quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      unit_cost: { type: DECIMAL(15, 4), allowNull: false, defaultValue: 0 },
      realized_gain_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('investment_orders', ['company_id', 'order_number'], {
      name: 'idx_inv_orders_company_number',
    });
    await queryInterface.addIndex('investment_trades', ['company_id', 'trade_number'], {
      name: 'idx_inv_trades_company_number',
    });
    await queryInterface.addIndex('investment_settlements', ['company_id', 'trade_id'], {
      name: 'idx_inv_settlements_trade',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_trade_lot_allocations');
    await queryInterface.dropTable('investment_settlements');
    await queryInterface.dropTable('investment_trades');
    await queryInterface.dropTable('investment_orders');
  },
};
