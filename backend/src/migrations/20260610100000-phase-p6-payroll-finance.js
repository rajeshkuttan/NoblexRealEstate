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

const financePostingStatus = {
  type: require('sequelize').ENUM('UNPOSTED', 'POSTED', 'REVERSED'),
  allowNull: false,
  defaultValue: 'UNPOSTED',
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
    const fps = financePostingStatus;

    if (!(await tableExists(queryInterface, 'payroll_account_configurations'))) {
      await queryInterface.createTable('payroll_account_configurations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'company_settings', key: 'id' } },
        basic_salary_expense_account: { type: Sequelize.INTEGER, allowNull: true },
        housing_expense_account: { type: Sequelize.INTEGER, allowNull: true },
        transport_expense_account: { type: Sequelize.INTEGER, allowNull: true },
        allowance_expense_account: { type: Sequelize.INTEGER, allowNull: true },
        overtime_expense_account: { type: Sequelize.INTEGER, allowNull: true },
        payroll_payable_account: { type: Sequelize.INTEGER, allowNull: false },
        loan_recovery_account: { type: Sequelize.INTEGER, allowNull: true },
        eos_expense_account: { type: Sequelize.INTEGER, allowNull: true },
        eos_provision_account: { type: Sequelize.INTEGER, allowNull: true },
        leave_encashment_account: { type: Sequelize.INTEGER, allowNull: true },
        settlement_payable_account: { type: Sequelize.INTEGER, allowNull: true },
        salary_clearing_account: { type: Sequelize.INTEGER, allowNull: true },
        staff_cost_center_id: { type: Sequelize.INTEGER, allowNull: true },
        eos_accrual_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        wps_clearing_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, 'employee_ledger_headers'))) {
      await queryInterface.createTable('employee_ledger_headers', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        employee_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employees', key: 'id' },
        },
        ledger_no: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        status: { type: Sequelize.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
        ...ts,
      });
      await queryInterface.addIndex('employee_ledger_headers', ['company_id', 'employee_id'], {
        unique: true,
        name: 'uq_employee_ledger_header',
      });
    }

    if (!(await tableExists(queryInterface, 'employee_ledger_lines'))) {
      await queryInterface.createTable('employee_ledger_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: cfk,
        ledger_header_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'employee_ledger_headers', key: 'id' },
          onDelete: 'CASCADE',
        },
        transaction_date: { type: Sequelize.DATEONLY, allowNull: false },
        source_type: {
          type: Sequelize.ENUM('PAYROLL', 'LOAN', 'ADVANCE', 'EOS', 'SETTLEMENT', 'ADJUSTMENT', 'PAYMENT', 'RECOVERY'),
          allowNull: false,
        },
        source_id: { type: Sequelize.INTEGER, allowNull: true },
        reference_no: { type: Sequelize.STRING(50), allowNull: true },
        description: { type: Sequelize.STRING(255), allowNull: true },
        debit: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        credit: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        balance: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
    }

    await addColumnIfMissing(queryInterface, 'payroll_runs', 'finance_posting_status', fps);
    await addColumnIfMissing(queryInterface, 'payroll_runs', 'finance_posted_at', { type: Sequelize.DATE, allowNull: true });
    await addColumnIfMissing(queryInterface, 'payroll_runs', 'finance_transaction_no', { type: Sequelize.INTEGER, allowNull: true });

    await addColumnIfMissing(queryInterface, 'payroll_final_settlements', 'finance_posting_status', fps);
    await addColumnIfMissing(queryInterface, 'payroll_final_settlements', 'finance_posted_at', { type: Sequelize.DATE, allowNull: true });
    await addColumnIfMissing(queryInterface, 'payroll_final_settlements', 'finance_transaction_no', { type: Sequelize.INTEGER, allowNull: true });

    await addColumnIfMissing(queryInterface, 'payroll_wps_batches', 'finance_clearing_status', {
      type: Sequelize.ENUM('UNPOSTED', 'POSTED', 'REVERSED'),
      allowNull: false,
      defaultValue: 'UNPOSTED',
    });
    await addColumnIfMissing(queryInterface, 'payroll_wps_batches', 'finance_clearing_transaction_no', {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await addColumnIfMissing(queryInterface, 'accounts_trans', 'payroll_run_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'payroll_runs', key: 'id' },
    });
    await addColumnIfMissing(queryInterface, 'accounts_trans', 'payroll_settlement_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'payroll_final_settlements', key: 'id' },
    });
    await addColumnIfMissing(queryInterface, 'accounts_trans', 'payroll_wps_batch_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'payroll_wps_batches', key: 'id' },
    });
  },

  down: async (queryInterface) => {
    const tables = ['employee_ledger_lines', 'employee_ledger_headers', 'payroll_account_configurations'];
    for (const t of tables) {
      if (await tableExists(queryInterface, t)) await queryInterface.dropTable(t);
    }
    const cols = [
      ['accounts_trans', 'payroll_wps_batch_id'],
      ['accounts_trans', 'payroll_settlement_id'],
      ['accounts_trans', 'payroll_run_id'],
      ['payroll_wps_batches', 'finance_clearing_transaction_no'],
      ['payroll_wps_batches', 'finance_clearing_status'],
      ['payroll_final_settlements', 'finance_transaction_no'],
      ['payroll_final_settlements', 'finance_posted_at'],
      ['payroll_final_settlements', 'finance_posting_status'],
      ['payroll_runs', 'finance_transaction_no'],
      ['payroll_runs', 'finance_posted_at'],
      ['payroll_runs', 'finance_posting_status'],
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
