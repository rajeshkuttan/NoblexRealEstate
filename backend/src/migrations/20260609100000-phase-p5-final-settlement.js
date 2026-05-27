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

    await addColumnIfMissing(queryInterface, 'employees', 'contract_type', {
      type: Sequelize.ENUM('LIMITED', 'UNLIMITED'),
      allowNull: true,
    });

    if (!(await tableExists(queryInterface, 'payroll_eos_configurations'))) {
      await queryInterface.createTable('payroll_eos_configurations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        rule_name: { type: Sequelize.STRING(200), allowNull: false },
        contract_type: { type: Sequelize.ENUM('LIMITED', 'UNLIMITED', 'ALL'), allowNull: false, defaultValue: 'ALL' },
        minimum_service_months: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        gratuity_formula_type: { type: Sequelize.ENUM('FIXED', 'RULE_BASED'), allowNull: false, defaultValue: 'RULE_BASED' },
        daily_salary_basis: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'BASIC_DIV_30' },
        fixed_gratuity_days: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        fixed_gratuity_rate: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
        notice_recovery_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_eos_rule_tiers'))) {
      await queryInterface.createTable('payroll_eos_rule_tiers', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        eos_configuration_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_eos_configurations', key: 'id' },
          onDelete: 'CASCADE',
        },
        service_years_from: { type: Sequelize.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
        service_years_to: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        gratuity_days_per_year: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        percent_of_basic: { type: Sequelize.DECIMAL(8, 4), allowNull: true },
        applies_to_separation_types: { type: Sequelize.JSON, allowNull: true },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, 'employee_separations'))) {
      await queryInterface.createTable('employee_separations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
        },
        separation_type: {
          type: Sequelize.ENUM('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'MUTUAL', 'DEATH'),
          allowNull: false,
        },
        last_working_day: { type: Sequelize.DATEONLY, allowNull: false },
        notice_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        served_notice_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        reason: { type: Sequelize.TEXT, allowNull: true },
        status: {
          type: Sequelize.ENUM('DRAFT', 'SUBMITTED', 'APPROVED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
      await addIndexIfMissing(queryInterface, 'employee_separations', ['company_id', 'employee_id'], {
        name: 'idx_separation_company_employee',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_final_settlements'))) {
      await queryInterface.createTable('payroll_final_settlements', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
        },
        separation_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employee_separations', key: 'id' },
        },
        settlement_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        settlement_date: { type: Sequelize.DATEONLY, allowNull: false },
        gross_settlement: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        deductions: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        net_settlement: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        calculation_snapshot: { type: Sequelize.JSON, allowNull: true },
        status: {
          type: Sequelize.ENUM('DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'LOCKED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        created_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        ...ts,
      });
      await addIndexIfMissing(queryInterface, 'payroll_final_settlements', ['company_id', 'separation_id'], {
        name: 'idx_settlement_separation',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_final_settlement_lines'))) {
      await queryInterface.createTable('payroll_final_settlement_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        settlement_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_final_settlements', key: 'id' },
          onDelete: 'CASCADE',
        },
        component_type: {
          type: Sequelize.ENUM(
            'EOSB',
            'LEAVE_ENCASHMENT',
            'SALARY_PAYABLE',
            'BONUS',
            'LOAN_RECOVERY',
            'NOTICE_RECOVERY',
            'DEDUCTION',
            'ADJUSTMENT'
          ),
          allowNull: false,
        },
        component_name: { type: Sequelize.STRING(200), allowNull: false },
        amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        calculation_source: { type: Sequelize.JSON, allowNull: true },
        remarks: { type: Sequelize.STRING(255), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }
  },

  down: async (queryInterface) => {
    const tables = [
      'payroll_final_settlement_lines',
      'payroll_final_settlements',
      'employee_separations',
      'payroll_eos_rule_tiers',
      'payroll_eos_configurations',
    ];
    for (const t of tables) {
      if (await tableExists(queryInterface, t)) {
        await queryInterface.dropTable(t);
      }
    }
    try {
      await queryInterface.removeColumn('employees', 'contract_type');
    } catch (_) {
      /* ignore */
    }
  },
};
