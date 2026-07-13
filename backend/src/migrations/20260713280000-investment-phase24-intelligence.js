'use strict';

const { INTEGER, STRING, TEXT, DATE, DATEONLY, BOOLEAN, ENUM, literal } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable('investment_saved_reports', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      report_code: { type: STRING(100), allowNull: false },
      name: { type: STRING(255), allowNull: false },
      filters_json: { type: TEXT, allowNull: true },
      format: {
        type: ENUM('JSON', 'PDF', 'EXCEL', 'CSV'),
        allowNull: false,
        defaultValue: 'JSON',
      },
      created_by: { type: INTEGER, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_report_packs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      pack_code: { type: STRING(50), allowNull: false },
      name: { type: STRING(255), allowNull: false },
      report_codes_json: { type: TEXT, allowNull: false },
      status: {
        type: ENUM('DRAFT', 'ACTIVE', 'ARCHIVED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      created_by: { type: INTEGER, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_report_schedules', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      pack_id: { type: INTEGER, allowNull: true },
      saved_report_id: { type: INTEGER, allowNull: true },
      schedule_code: { type: STRING(50), allowNull: false },
      cadence: {
        type: ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY'),
        allowNull: false,
        defaultValue: 'MONTHLY',
      },
      next_run_at: { type: DATE, allowNull: true },
      last_run_at: { type: DATE, allowNull: true },
      email_to: { type: STRING(500), allowNull: true },
      format: {
        type: ENUM('JSON', 'PDF', 'EXCEL', 'CSV'),
        allowNull: false,
        defaultValue: 'PDF',
      },
      status: {
        type: ENUM('ACTIVE', 'PAUSED', 'CANCELLED'),
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

    await queryInterface.createTable('investment_export_history', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      report_code: { type: STRING(100), allowNull: false },
      pack_id: { type: INTEGER, allowNull: true },
      format: { type: STRING(20), allowNull: false, defaultValue: 'JSON' },
      row_count: { type: INTEGER, allowNull: false, defaultValue: 0 },
      status: {
        type: ENUM('SUCCESS', 'FAILED', 'PARTIAL'),
        allowNull: false,
        defaultValue: 'SUCCESS',
      },
      file_ref: { type: STRING(255), allowNull: true },
      filters_json: { type: TEXT, allowNull: true },
      generated_by: { type: INTEGER, allowNull: true },
      error_message: { type: TEXT, allowNull: true },
      is_test_data: { type: BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: DATE,
        allowNull: false,
        defaultValue: literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.createTable('investment_copilot_tool_logs', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      user_id: { type: INTEGER, allowNull: true },
      tool_name: { type: STRING(100), allowNull: false },
      portfolio_id: { type: INTEGER, allowNull: true },
      investor_id: { type: INTEGER, allowNull: true },
      args_json: { type: TEXT, allowNull: true },
      result_summary: { type: STRING(500), allowNull: true },
      status: {
        type: ENUM('OK', 'DENIED', 'ERROR'),
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
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('investment_copilot_tool_logs');
    await queryInterface.dropTable('investment_export_history');
    await queryInterface.dropTable('investment_report_schedules');
    await queryInterface.dropTable('investment_report_packs');
    await queryInterface.dropTable('investment_saved_reports');
  },
};
