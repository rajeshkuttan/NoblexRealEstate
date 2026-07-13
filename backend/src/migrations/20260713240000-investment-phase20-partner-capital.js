'use strict';

const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, DECIMAL, ENUM, literal } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('investment_investors', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      investor_code: { type: STRING(50), allowNull: false },
      legal_name: { type: STRING(255), allowNull: false },
      display_name: { type: STRING(255), allowNull: true },
      investor_type: {
        type: ENUM(
          'OWNER', 'PARTNER', 'COMPANY', 'FAMILY_OFFICE', 'TRUST',
          'NOMINEE', 'BENEFICIARY', 'EXTERNAL_INVESTOR'
        ),
        allowNull: false,
        defaultValue: 'PARTNER',
      },
      person_or_entity: { type: ENUM('PERSON', 'ENTITY'), allowNull: false, defaultValue: 'ENTITY' },
      nationality: { type: STRING(100), allowNull: true },
      jurisdiction: { type: STRING(100), allowNull: true },
      email: { type: STRING(255), allowNull: true },
      phone: { type: STRING(50), allowNull: true },
      preferred_currency: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      bank_account_id: { type: INTEGER, allowNull: true },
      tax_identifier: { type: STRING(100), allowNull: true },
      kyc_status: { type: STRING(50), allowNull: false, defaultValue: 'PENDING' },
      aml_risk_rating: { type: STRING(30), allowNull: false, defaultValue: 'MEDIUM' },
      ubo_status: { type: STRING(50), allowNull: true },
      source_of_funds_status: { type: STRING(50), allowNull: true },
      related_party_flag: { type: BOOLEAN, allowNull: false, defaultValue: false },
      onboarding_status: { type: STRING(50), allowNull: false, defaultValue: 'DRAFT' },
      reinvestment_preference: { type: STRING(50), allowNull: true },
      distribution_method: { type: STRING(50), allowNull: true, defaultValue: 'BANK_TRANSFER' },
      status: { type: ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'), allowNull: false, defaultValue: 'ACTIVE' },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
      deleted_at: { type: DATE, allowNull: true },
    });

    await queryInterface.createTable('investment_commitments', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      investor_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      commitment_number: { type: STRING(50), allowNull: false },
      commitment_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      currency_code: { type: STRING(3), allowNull: false, defaultValue: 'AED' },
      commitment_date: { type: DATEONLY, allowNull: false },
      expiry_date: { type: DATEONLY, allowNull: true },
      funded_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      unfunded_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: ENUM('DRAFT', 'ACTIVE', 'FULLY_FUNDED', 'EXPIRED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_capital_calls', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      call_number: { type: STRING(50), allowNull: false },
      call_date: { type: DATEONLY, allowNull: false },
      due_date: { type: DATEONLY, allowNull: true },
      total_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      purpose: { type: STRING(255), allowNull: true },
      status: {
        type: ENUM('DRAFT', 'ISSUED', 'PARTIALLY_FUNDED', 'FUNDED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_capital_call_lines', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      capital_call_id: { type: INTEGER, allowNull: false },
      investor_id: { type: INTEGER, allowNull: false },
      commitment_id: { type: INTEGER, allowNull: true },
      called_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      received_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      outstanding_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: ENUM('PENDING', 'PARTIAL', 'RECEIVED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_capital_accounts', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      investor_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      period: { type: STRING(20), allowNull: false },
      opening_balance: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      contributions: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      allocated_income: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      allocated_gain: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      allocated_loss: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      distributions: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      return_of_capital: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      closing_balance: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_ownership_history', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      instrument_id: { type: INTEGER, allowNull: true },
      investor_id: { type: INTEGER, allowNull: false },
      ownership_percentage: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 0 },
      profit_share_percentage: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 0 },
      loss_share_percentage: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 0 },
      dividend_share_percentage: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 0 },
      voting_percentage: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 0 },
      beneficial_percentage: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 0 },
      effective_from: { type: DATEONLY, allowNull: false },
      effective_to: { type: DATEONLY, allowNull: true },
      status: { type: ENUM('ACTIVE', 'SUPERSEDED', 'CANCELLED'), allowNull: false, defaultValue: 'ACTIVE' },
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

    await queryInterface.createTable('investment_distribution_runs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: false },
      distribution_number: { type: STRING(50), allowNull: false },
      period_start: { type: DATEONLY, allowNull: true },
      period_end: { type: DATEONLY, allowNull: true },
      distribution_type: { type: STRING(50), allowNull: false, defaultValue: 'PRO_RATA' },
      gross_distributable_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      expenses_deducted: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      reserve_retained: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      preferred_return: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      carried_interest: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      withholding_tax: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      net_distributable_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      waterfall_config: { type: TEXT, allowNull: true },
      status: {
        type: ENUM(
          'DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'PAYABLE_CREATED',
          'PAYMENT_AUTHORIZED', 'PAID', 'RECONCILED', 'STATEMENT_ISSUED', 'CANCELLED'
        ),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      approval_status: { type: STRING(50), allowNull: false, defaultValue: 'PENDING' },
      payment_status: { type: STRING(50), allowNull: false, defaultValue: 'UNPAID' },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_distribution_run_lines', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      distribution_run_id: { type: INTEGER, allowNull: false },
      investor_id: { type: INTEGER, allowNull: false },
      ownership_percentage: { type: DECIMAL(12, 6), allowNull: false, defaultValue: 0 },
      preferred_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      catch_up_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      residual_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      carried_interest_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      withholding_tax: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      gross_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      net_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      tier_breakdown: { type: TEXT, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('investment_investors', ['company_id', 'investor_code'], {
      name: 'idx_inv_investors_code',
      unique: true,
    });
    await queryInterface.addIndex('investment_commitments', ['company_id', 'commitment_number'], {
      name: 'idx_inv_commit_number',
    });
    await queryInterface.addIndex('investment_ownership_history', ['company_id', 'portfolio_id', 'investor_id'], {
      name: 'idx_inv_own_hist',
    });
    await queryInterface.addIndex('investment_distribution_runs', ['company_id', 'distribution_number'], {
      name: 'idx_inv_dist_run_number',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_distribution_run_lines');
    await queryInterface.dropTable('investment_distribution_runs');
    await queryInterface.dropTable('investment_ownership_history');
    await queryInterface.dropTable('investment_capital_accounts');
    await queryInterface.dropTable('investment_capital_call_lines');
    await queryInterface.dropTable('investment_capital_calls');
    await queryInterface.dropTable('investment_commitments');
    await queryInterface.dropTable('investment_investors');
  },
};
