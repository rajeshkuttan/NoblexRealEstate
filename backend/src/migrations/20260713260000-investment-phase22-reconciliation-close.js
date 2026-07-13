'use strict';

const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, DECIMAL, ENUM, literal } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('investment_reconciliation_batches', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      batch_number: { type: STRING(50), allowNull: false },
      reconciliation_type: {
        type: ENUM('BROKER', 'CUSTODIAN', 'BANK', 'INCOME', 'SUBLEDGER_GL', 'OWNERSHIP_CAPITAL', 'VALUATION'),
        allowNull: false,
      },
      source_file_id: { type: STRING(100), allowNull: true },
      statement_date: { type: DATEONLY, allowNull: false },
      status: {
        type: ENUM('DRAFT', 'IMPORTED', 'MATCHING', 'MATCHED', 'EXCEPTION', 'APPROVED', 'CLOSED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      total_records: { type: INTEGER, allowNull: false, defaultValue: 0 },
      matched_records: { type: INTEGER, allowNull: false, defaultValue: 0 },
      exception_records: { type: INTEGER, allowNull: false, defaultValue: 0 },
      unmatched_records: { type: INTEGER, allowNull: false, defaultValue: 0 },
      amount_tolerance: { type: DECIMAL(15, 4), allowNull: false, defaultValue: 0.01 },
      quantity_tolerance: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0.000001 },
      date_tolerance_days: { type: INTEGER, allowNull: false, defaultValue: 0 },
      remarks: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_reconciliation_lines', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      batch_id: { type: INTEGER, allowNull: false },
      source_reference: { type: STRING(100), allowNull: true },
      internal_reference: { type: STRING(100), allowNull: true },
      instrument_id: { type: INTEGER, allowNull: true },
      line_date: { type: DATEONLY, allowNull: true },
      expected_amount: { type: DECIMAL(15, 2), allowNull: true },
      actual_amount: { type: DECIMAL(15, 2), allowNull: true },
      expected_quantity: { type: DECIMAL(18, 6), allowNull: true },
      actual_quantity: { type: DECIMAL(18, 6), allowNull: true },
      difference_amount: { type: DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      difference_quantity: { type: DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
      match_status: {
        type: ENUM('MATCHED', 'PARTIAL', 'UNMATCHED', 'EXCEPTION', 'RESOLVED'),
        allowNull: false,
        defaultValue: 'UNMATCHED',
      },
      match_method: { type: STRING(50), allowNull: true },
      exception_reason: { type: TEXT, allowNull: true },
      resolution_status: {
        type: ENUM('OPEN', 'APPROVED', 'WAIVED', 'CORRECTED', 'CLOSED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      resolved_by: { type: INTEGER, allowNull: true },
      resolved_at: { type: DATE, allowNull: true },
      resolution_notes: { type: TEXT, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_close_periods', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      period: { type: STRING(20), allowNull: false },
      status: {
        type: ENUM('OPEN', 'IN_PROGRESS', 'READY', 'CLOSED', 'REOPENED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      checklist_json: { type: TEXT, allowNull: true },
      closed_by: { type: INTEGER, allowNull: true },
      closed_at: { type: DATE, allowNull: true },
      reopened_by: { type: INTEGER, allowNull: true },
      reopened_at: { type: DATE, allowNull: true },
      reopened_reason: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('investment_reconciliation_batches', ['company_id', 'batch_number'], {
      name: 'idx_inv_recon_batch_number',
    });
    await queryInterface.addIndex('investment_reconciliation_lines', ['company_id', 'batch_id'], {
      name: 'idx_inv_recon_lines_batch',
    });
    await queryInterface.addIndex('investment_close_periods', ['company_id', 'period', 'portfolio_id'], {
      name: 'idx_inv_close_period',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_close_periods');
    await queryInterface.dropTable('investment_reconciliation_lines');
    await queryInterface.dropTable('investment_reconciliation_batches');
  },
};
