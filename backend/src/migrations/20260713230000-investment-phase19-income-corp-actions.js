'use strict';

const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, DECIMAL, ENUM, literal } = require('sequelize');

const INCOME_TYPES = [
  'DIVIDEND',
  'INTEREST',
  'COUPON',
  'PROFIT_DISTRIBUTION',
  'FUND_DISTRIBUTION',
  'RENTAL_DISTRIBUTION',
  'CAPITAL_REPAYMENT',
  'RETURN_OF_CAPITAL',
  'REDEMPTION_INCOME',
  'SPECIAL_DIVIDEND',
];

const INCOME_STATUSES = [
  'EXPECTED',
  'ACCRUED',
  'RECEIVABLE',
  'RECEIVED',
  'RECONCILED',
  'DISTRIBUTED',
  'REINVESTED',
  'CANCELLED',
];

const ACTION_TYPES = [
  'CASH_DIVIDEND',
  'STOCK_DIVIDEND',
  'BONUS_ISSUE',
  'STOCK_SPLIT',
  'REVERSE_SPLIT',
  'RIGHTS_ISSUE',
  'REDEMPTION',
  'MERGER',
  'SPIN_OFF',
  'CONVERSION',
  'CAPITAL_REPAYMENT',
  'TENDER_OFFER',
  'MATURITY',
  'CALL',
  'PUT',
];

const ACTION_STATUSES = ['ANNOUNCED', 'ENTITLED', 'ELECTED', 'APPLIED', 'SETTLED', 'CANCELLED'];

const ENTITLEMENT_STATUSES = ['PENDING', 'CONFIRMED', 'APPLIED', 'CANCELLED'];

module.exports = {
  INCOME_TYPES,
  INCOME_STATUSES,
  ACTION_TYPES,
  ACTION_STATUSES,
  ENTITLEMENT_STATUSES,

  up: async (queryInterface) => {
    await queryInterface.createTable('investment_income_events', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      instrument_id: { type: INTEGER, allowNull: false },
      holding_v2_id: { type: INTEGER, allowNull: true },
      event_number: { type: STRING(50), allowNull: false },
      income_type: { type: ENUM(...INCOME_TYPES), allowNull: false },
      declaration_date: { type: DATEONLY, allowNull: true },
      ex_date: { type: DATEONLY, allowNull: true },
      record_date: { type: DATEONLY, allowNull: true },
      payment_date: { type: DATEONLY, allowNull: true },
      accrual_start: { type: DATEONLY, allowNull: true },
      accrual_end: { type: DATEONLY, allowNull: true },
      quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      rate_or_per_unit: { type: DECIMAL(18, 8), allowNull: true },
      gross_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      accrued_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      withholding_tax: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      net_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      currency_code: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      exchange_rate: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 1 },
      status: { type: ENUM(...INCOME_STATUSES), allowNull: false, defaultValue: 'EXPECTED' },
      source: { type: STRING(50), allowNull: false, defaultValue: 'MANUAL' },
      linked_transaction_id: { type: INTEGER, allowNull: true },
      corporate_action_id: { type: INTEGER, allowNull: true },
      bank_account_id: { type: INTEGER, allowNull: true },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_corporate_actions', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      instrument_id: { type: INTEGER, allowNull: false },
      action_number: { type: STRING(50), allowNull: false },
      action_type: { type: ENUM(...ACTION_TYPES), allowNull: false },
      announcement_date: { type: DATEONLY, allowNull: true },
      ex_date: { type: DATEONLY, allowNull: true },
      record_date: { type: DATEONLY, allowNull: true },
      effective_date: { type: DATEONLY, allowNull: true },
      election_deadline: { type: DATEONLY, allowNull: true },
      ratio_numerator: { type: DECIMAL(18, 8), allowNull: true },
      ratio_denominator: { type: DECIMAL(18, 8), allowNull: true },
      cash_component: { type: DECIMAL(15, 4), allowNull: true },
      stock_component: { type: DECIMAL(18, 6), allowNull: true },
      new_instrument_id: { type: INTEGER, allowNull: true },
      status: { type: ENUM(...ACTION_STATUSES), allowNull: false, defaultValue: 'ANNOUNCED' },
      source_document_id: { type: INTEGER, allowNull: true },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_entitlements', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      corporate_action_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      holding_v2_id: { type: INTEGER, allowNull: true },
      holding_date: { type: DATEONLY, allowNull: true },
      eligible_quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      entitlement_quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      entitlement_cash: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: { type: ENUM(...ENTITLEMENT_STATUSES), allowNull: false, defaultValue: 'PENDING' },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('investment_income_events', ['company_id', 'event_number'], {
      name: 'idx_inv_income_company_number',
    });
    await queryInterface.addIndex('investment_income_events', ['company_id', 'status'], {
      name: 'idx_inv_income_status',
    });
    await queryInterface.addIndex('investment_corporate_actions', ['company_id', 'action_number'], {
      name: 'idx_inv_ca_company_number',
    });
    await queryInterface.addIndex('investment_entitlements', ['company_id', 'corporate_action_id'], {
      name: 'idx_inv_ent_ca',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_entitlements');
    await queryInterface.dropTable('investment_corporate_actions');
    await queryInterface.dropTable('investment_income_events');
  },
};
