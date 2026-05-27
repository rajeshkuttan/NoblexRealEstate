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

async function tableExists(queryInterface, name) {
  const tables = await queryInterface.showAllTables();
  const list = Array.isArray(tables) ? tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.TABLE_NAME)) : [];
  return list.includes(name);
}

async function addColumnIfMissing(queryInterface, table, column, definition) {
  const desc = await queryInterface.describeTable(table);
  if (!desc[column]) {
    await queryInterface.addColumn(table, column, definition);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = timestamps;
    const cfk = companyFk;

    await addColumnIfMissing(queryInterface, 'company_document_templates', 'watermark', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'company_document_templates', 'show_company_address', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    if (!(await tableExists(queryInterface, 'payroll_payslips'))) {
      await queryInterface.createTable('payroll_payslips', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        payroll_run_employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_run_employees', key: 'id' },
        },
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
        },
        payroll_period_id: { type: Sequelize.INTEGER, allowNull: true },
        payslip_number: { type: Sequelize.STRING(50), allowNull: false },
        gross_salary: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        deductions: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        net_salary: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        generated_at: { type: Sequelize.DATE, allowNull: true },
        generated_by: { type: Sequelize.INTEGER, allowNull: true },
        status: {
          type: Sequelize.ENUM('DRAFT', 'GENERATED', 'PUBLISHED', 'VOID'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        pdf_path: { type: Sequelize.STRING(500), allowNull: true },
        document_snapshot: { type: Sequelize.JSON, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex('payroll_payslips', ['company_id', 'payslip_number'], {
        unique: true,
        name: 'uq_payroll_payslip_number',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_exports'))) {
      await queryInterface.createTable('payroll_exports', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        export_type: { type: Sequelize.STRING(80), allowNull: false },
        format: { type: Sequelize.ENUM('pdf', 'xlsx', 'csv'), allowNull: false },
        file_path: { type: Sequelize.STRING(500), allowNull: true },
        parameters: { type: Sequelize.JSON, allowNull: true },
        generated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        generated_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_document_distribution_queue'))) {
      await queryInterface.createTable('payroll_document_distribution_queue', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        channel: { type: Sequelize.ENUM('EMAIL'), allowNull: false, defaultValue: 'EMAIL' },
        status: {
          type: Sequelize.ENUM('PENDING', 'READY', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        recipient_email: { type: Sequelize.STRING(255), allowNull: true },
        recipient_name: { type: Sequelize.STRING(255), allowNull: true },
        document_refs: { type: Sequelize.JSON, allowNull: true },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_batch_jobs'))) {
      await queryInterface.createTable('payroll_batch_jobs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        job_type: { type: Sequelize.STRING(50), allowNull: false },
        payroll_run_id: { type: Sequelize.INTEGER, allowNull: true },
        total: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        processed: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        status: {
          type: Sequelize.ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED'),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        ...ts,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('payroll_batch_jobs');
    await queryInterface.dropTable('payroll_document_distribution_queue');
    await queryInterface.dropTable('payroll_exports');
    await queryInterface.dropTable('payroll_payslips');
  },
};
