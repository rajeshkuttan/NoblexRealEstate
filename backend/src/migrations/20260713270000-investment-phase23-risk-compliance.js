'use strict';

const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, DECIMAL, ENUM, literal } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('investment_mandates', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      mandate_code: { type: STRING(50), allowNull: false },
      name: { type: STRING(255), allowNull: false },
      effective_from: { type: DATEONLY, allowNull: false },
      effective_to: { type: DATEONLY, allowNull: true },
      allowed_asset_classes_json: { type: TEXT, allowNull: true },
      prohibited_asset_classes_json: { type: TEXT, allowNull: true },
      target_allocation_json: { type: TEXT, allowNull: true },
      concentration_limits_json: { type: TEXT, allowNull: true },
      liquidity_limits_json: { type: TEXT, allowNull: true },
      currency_limits_json: { type: TEXT, allowNull: true },
      country_limits_json: { type: TEXT, allowNull: true },
      issuer_limits_json: { type: TEXT, allowNull: true },
      status: {
        type: ENUM('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_risk_limits', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      limit_code: { type: STRING(50), allowNull: false },
      limit_type: {
        type: ENUM(
          'CONCENTRATION',
          'ISSUER',
          'CURRENCY',
          'COUNTRY',
          'SECTOR',
          'LIQUIDITY',
          'COUNTERPARTY',
          'RELATED_PARTY',
          'CASH',
          'CUSTOM'
        ),
        allowNull: false,
      },
      dimension: { type: STRING(100), allowNull: true },
      threshold_warning: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      threshold_breach: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      measurement_basis: {
        type: ENUM('PERCENT_NAV', 'ABSOLUTE', 'COUNT'),
        allowNull: false,
        defaultValue: 'PERCENT_NAV',
      },
      effective_from: { type: DATEONLY, allowNull: false },
      effective_to: { type: DATEONLY, allowNull: true },
      status: {
        type: ENUM('ACTIVE', 'INACTIVE', 'EXPIRED'),
        allowNull: false,
        defaultValue: 'ACTIVE',
      },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_risk_breaches', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      limit_id: { type: INTEGER, allowNull: true },
      mandate_id: { type: INTEGER, allowNull: true },
      breach_number: { type: STRING(50), allowNull: false },
      detected_at: { type: DATE, allowNull: false },
      actual_value: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      limit_value: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      severity: {
        type: ENUM('WARNING', 'BREACH', 'CRITICAL'),
        allowNull: false,
        defaultValue: 'BREACH',
      },
      status: {
        type: ENUM('OPEN', 'UNDER_REVIEW', 'EXCEPTION_APPROVED', 'REMEDIATED', 'CLOSED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      dimension_key: { type: STRING(100), allowNull: true },
      remediation_plan: { type: TEXT, allowNull: true },
      override_reason: { type: TEXT, allowNull: true },
      approved_exception_by: { type: INTEGER, allowNull: true },
      resolved_at: { type: DATE, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_compliance_checks', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      investor_id: { type: INTEGER, allowNull: true },
      instrument_id: { type: INTEGER, allowNull: true },
      portfolio_id: { type: INTEGER, allowNull: true },
      check_type: {
        type: ENUM(
          'KYC',
          'AML',
          'UBO',
          'SOURCE_OF_FUNDS',
          'SANCTIONS',
          'RESTRICTED_ASSET',
          'RELATED_PARTY',
          'DOCUMENT',
          'PRE_TRADE'
        ),
        allowNull: false,
      },
      status: {
        type: ENUM('PENDING', 'PASS', 'FAIL', 'EXPIRED', 'WAIVED', 'UNDER_REVIEW'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      checked_at: { type: DATE, allowNull: true },
      expiry_date: { type: DATEONLY, allowNull: true },
      result_json: { type: TEXT, allowNull: true },
      provider_ref: { type: STRING(100), allowNull: true },
      reviewed_by: { type: INTEGER, allowNull: true },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addColumn('investment_instruments', 'is_restricted', {
      type: BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('investment_investors', 'kyc_expiry_date', {
      type: DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('investment_investors', 'kyc_review_date', {
      type: DATEONLY,
      allowNull: true,
    });
    await queryInterface.addColumn('investment_investors', 'sanctions_result_ref', {
      type: STRING(100),
      allowNull: true,
    });
    await queryInterface.addColumn('investment_investors', 'compliance_approval_status', {
      type: STRING(50),
      allowNull: false,
      defaultValue: 'PENDING',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('investment_investors', 'compliance_approval_status').catch(() => {});
    await queryInterface.removeColumn('investment_investors', 'sanctions_result_ref').catch(() => {});
    await queryInterface.removeColumn('investment_investors', 'kyc_review_date').catch(() => {});
    await queryInterface.removeColumn('investment_investors', 'kyc_expiry_date').catch(() => {});
    await queryInterface.removeColumn('investment_instruments', 'is_restricted').catch(() => {});
    await queryInterface.dropTable('investment_compliance_checks');
    await queryInterface.dropTable('investment_risk_breaches');
    await queryInterface.dropTable('investment_risk_limits');
    await queryInterface.dropTable('investment_mandates');
  },
};
