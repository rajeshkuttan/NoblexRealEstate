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

async function indexExists(queryInterface, tableName, indexName) {
  try {
    const indexes = await queryInterface.showIndex(tableName);
    return indexes.some((idx) => idx.name === indexName || idx.Key_name === indexName);
  } catch {
    return false;
  }
}

async function addIndexIfMissing(queryInterface, table, fields, options) {
  if (!(await indexExists(queryInterface, table, options.name))) {
    await queryInterface.addIndex(table, fields, options);
  }
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const ts = timestamps;
    const cfk = companyFk;

    await addColumnIfMissing(queryInterface, 'payroll_components', 'calculation_method', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'payroll_components', 'overtime_multiplier', {
      type: Sequelize.DECIMAL(8, 2),
      allowNull: true,
      defaultValue: 1.5,
    });

    if (!(await tableExists(queryInterface, 'payroll_periods'))) {
      await queryInterface.createTable('payroll_periods', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        attendance_period_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'payroll_attendance_periods', key: 'id' },
        },
        period_month: { type: Sequelize.INTEGER, allowNull: false },
        period_year: { type: Sequelize.INTEGER, allowNull: false },
        from_date: { type: Sequelize.DATEONLY, allowNull: false },
        to_date: { type: Sequelize.DATEONLY, allowNull: false },
        status: {
          type: Sequelize.ENUM('OPEN', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED'),
          allowNull: false,
          defaultValue: 'OPEN',
        },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        generated_at: { type: Sequelize.DATE, allowNull: true },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        locked_by: { type: Sequelize.INTEGER, allowNull: true },
        locked_at: { type: Sequelize.DATE, allowNull: true },
        ...ts,
      });
      await addIndexIfMissing(queryInterface, 'payroll_periods', ['company_id', 'period_year', 'period_month'], {
        unique: true,
        name: 'uq_payroll_period_company_month',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_runs'))) {
      await queryInterface.createTable('payroll_runs', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        payroll_period_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_periods', key: 'id' },
        },
        run_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        run_type: {
          type: Sequelize.ENUM('REGULAR', 'SUPPLEMENTARY', 'ADJUSTMENT', 'FINAL'),
          allowNull: false,
          defaultValue: 'REGULAR',
        },
        status: {
          type: Sequelize.ENUM('DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED', 'REVERSED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        total_employees: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        total_gross: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        total_deductions: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        total_net: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
      await addIndexIfMissing(queryInterface, 'payroll_runs', ['company_id', 'payroll_period_id'], {
        name: 'idx_payroll_runs_period',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_run_employees'))) {
      await queryInterface.createTable('payroll_run_employees', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        payroll_run_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_runs', key: 'id' },
          onDelete: 'CASCADE',
        },
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
        },
        salary_structure_snapshot: { type: Sequelize.JSON, allowNull: true },
        attendance_snapshot: { type: Sequelize.JSON, allowNull: true },
        payable_days: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        working_days: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        gross_salary: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        deductions: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        net_salary: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'CALCULATED' },
        ...ts,
      });
      await addIndexIfMissing(queryInterface, 'payroll_run_employees', ['payroll_run_id', 'employee_id'], {
        unique: true,
        name: 'uq_payroll_run_employee',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_run_component_lines'))) {
      await queryInterface.createTable('payroll_run_component_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        payroll_run_employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_run_employees', key: 'id' },
          onDelete: 'CASCADE',
        },
        component_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'payroll_components', key: 'id' },
        },
        component_type: {
          type: Sequelize.ENUM('EARNING', 'DEDUCTION', 'EMPLOYER', 'PROVISION'),
          allowNull: false,
        },
        calculation_method: { type: Sequelize.STRING(50), allowNull: true },
        calculated_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        base_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        formula_snapshot: { type: Sequelize.JSON, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_monthly_adjustments'))) {
      await queryInterface.createTable('payroll_monthly_adjustments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
        },
        payroll_period_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_periods', key: 'id' },
        },
        adjustment_type: {
          type: Sequelize.ENUM('ADDITION', 'DEDUCTION'),
          allowNull: false,
        },
        component_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'payroll_components', key: 'id' },
        },
        amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        reason: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, 'employee_loans'))) {
      await queryInterface.createTable('employee_loans', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
        },
        loan_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        monthly_installment: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        balance: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        start_period_month: { type: Sequelize.INTEGER, allowNull: false },
        start_period_year: { type: Sequelize.INTEGER, allowNull: false },
        end_period_month: { type: Sequelize.INTEGER, allowNull: true },
        end_period_year: { type: Sequelize.INTEGER, allowNull: true },
        status: {
          type: Sequelize.ENUM('ACTIVE', 'CLOSED', 'HOLD'),
          allowNull: false,
          defaultValue: 'ACTIVE',
        },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, 'employee_loan_installments'))) {
      await queryInterface.createTable('employee_loan_installments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        loan_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employee_loans', key: 'id' },
          onDelete: 'CASCADE',
        },
        due_period_month: { type: Sequelize.INTEGER, allowNull: false },
        due_period_year: { type: Sequelize.INTEGER, allowNull: false },
        installment_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        status: {
          type: Sequelize.ENUM('PENDING', 'APPROVED', 'DEDUCTED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'PENDING',
        },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        ...ts,
      });
      await addIndexIfMissing(
        queryInterface,
        'employee_loan_installments',
        ['loan_id', 'due_period_year', 'due_period_month'],
        { name: 'idx_loan_installment_due' }
      );
    }
  },

  down: async (queryInterface) => {
    const tables = [
      'employee_loan_installments',
      'employee_loans',
      'payroll_monthly_adjustments',
      'payroll_run_component_lines',
      'payroll_run_employees',
      'payroll_runs',
      'payroll_periods',
    ];
    for (const t of tables) {
      if (await tableExists(queryInterface, t)) {
        await queryInterface.dropTable(t);
      }
    }
    try {
      await queryInterface.removeColumn('payroll_components', 'calculation_method');
      await queryInterface.removeColumn('payroll_components', 'overtime_multiplier');
    } catch (_) {
      /* ignore */
    }
  },
};
