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

    await addColumnIfMissing(queryInterface, 'employee_bank_details', 'bank_code', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'employee_bank_details', 'salary_card_no', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'employee_bank_details', 'labour_card_no', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'employee_bank_details', 'mol_personal_id', {
      type: Sequelize.STRING(50),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, 'employee_bank_details', 'wps_enabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await addColumnIfMissing(queryInterface, 'employee_bank_details', 'payment_method', {
      type: Sequelize.ENUM('BANK_TRANSFER', 'SALARY_CARD', 'CASH', 'CHEQUE'),
      allowNull: false,
      defaultValue: 'BANK_TRANSFER',
    });

    await addColumnIfMissing(queryInterface, 'employees', 'gpssa_eligible', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await addColumnIfMissing(queryInterface, 'employees', 'uae_national', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    if (!(await tableExists(queryInterface, 'payroll_wps_configurations'))) {
      await queryInterface.createTable('payroll_wps_configurations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        visa_sponsor_company_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'visa_sponsor_companies', key: 'id' },
        },
        agent_name: { type: Sequelize.STRING(200), allowNull: true },
        agent_code: { type: Sequelize.STRING(50), allowNull: true },
        mol_establishment_id: { type: Sequelize.STRING(100), allowNull: true },
        mol_company_code: { type: Sequelize.STRING(50), allowNull: true },
        payer_bank_name: { type: Sequelize.STRING(200), allowNull: true },
        payer_bank_account: { type: Sequelize.STRING(50), allowNull: true },
        payer_bank_iban: { type: Sequelize.STRING(50), allowNull: true },
        salary_currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'AED' },
        default_salary_type: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'BASIC' },
        status: { type: Sequelize.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
        ...ts,
      });
      await addIndexIfMissing(
        queryInterface,
        'payroll_wps_configurations',
        ['company_id', 'visa_sponsor_company_id', 'status'],
        { name: 'idx_wps_config_company_sponsor' }
      );
    }

    if (!(await tableExists(queryInterface, 'payroll_wps_batches'))) {
      await queryInterface.createTable('payroll_wps_batches', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        payroll_run_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_runs', key: 'id' },
        },
        batch_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        salary_month: { type: Sequelize.INTEGER, allowNull: false },
        salary_year: { type: Sequelize.INTEGER, allowNull: false },
        total_employees: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        status: {
          type: Sequelize.ENUM('DRAFT', 'GENERATED', 'UNDER_REVIEW', 'APPROVED', 'EXPORTED', 'CANCELLED'),
          allowNull: false,
          defaultValue: 'DRAFT',
        },
        generated_by: { type: Sequelize.INTEGER, allowNull: true },
        approved_by: { type: Sequelize.INTEGER, allowNull: true },
        exported_at: { type: Sequelize.DATE, allowNull: true },
        ...ts,
      });
      await addIndexIfMissing(queryInterface, 'payroll_wps_batches', ['company_id', 'payroll_run_id'], {
        name: 'idx_wps_batch_run',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_wps_employee_lines'))) {
      await queryInterface.createTable('payroll_wps_employee_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        batch_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_wps_batches', key: 'id' },
          onDelete: 'CASCADE',
        },
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
        },
        employee_no: { type: Sequelize.STRING(50), allowNull: true },
        employee_name: { type: Sequelize.STRING(200), allowNull: true },
        labour_card_no: { type: Sequelize.STRING(50), allowNull: true },
        iban: { type: Sequelize.STRING(50), allowNull: true },
        salary_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        salary_type: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'BASIC' },
        remarks: { type: Sequelize.STRING(255), allowNull: true },
        validation_status: {
          type: Sequelize.ENUM('VALID', 'WARNING', 'ERROR'),
          allowNull: false,
          defaultValue: 'VALID',
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await addIndexIfMissing(queryInterface, 'payroll_wps_employee_lines', ['batch_id', 'employee_id'], {
        unique: true,
        name: 'uq_wps_line_batch_employee',
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_wps_sif_exports'))) {
      await queryInterface.createTable('payroll_wps_sif_exports', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        batch_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'payroll_wps_batches', key: 'id' },
        },
        file_name: { type: Sequelize.STRING(255), allowNull: false },
        sif_content: { type: Sequelize.TEXT('long'), allowNull: true },
        employee_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        exported_by: { type: Sequelize.INTEGER, allowNull: true },
        exported_at: { type: Sequelize.DATE, allowNull: false },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, 'payroll_gpssa_configuration'))) {
      await queryInterface.createTable('payroll_gpssa_configuration', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'company_settings', key: 'id' } },
        employee_rate: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
        employer_rate: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
        government_rate: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
    }
  },

  down: async (queryInterface) => {
    const tables = [
      'payroll_gpssa_configuration',
      'payroll_wps_sif_exports',
      'payroll_wps_employee_lines',
      'payroll_wps_batches',
      'payroll_wps_configurations',
    ];
    for (const t of tables) {
      if (await tableExists(queryInterface, t)) {
        await queryInterface.dropTable(t);
      }
    }
    const cols = [
      ['employee_bank_details', 'payment_method'],
      ['employee_bank_details', 'wps_enabled'],
      ['employee_bank_details', 'mol_personal_id'],
      ['employee_bank_details', 'labour_card_no'],
      ['employee_bank_details', 'salary_card_no'],
      ['employee_bank_details', 'bank_code'],
      ['employees', 'uae_national'],
      ['employees', 'gpssa_eligible'],
    ];
    for (const [table, col] of cols) {
      try {
        await queryInterface.removeColumn(table, col);
      } catch (_) {
        /* ignore */
      }
    }
  },
};
