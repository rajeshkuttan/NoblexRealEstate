'use strict';

async function tableExists(queryInterface, name) {
  const tables = await queryInterface.showAllTables();
  const list = Array.isArray(tables)
    ? tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.TABLE_NAME))
    : [];
  return list.includes(name);
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

const ts = {
  created_at: { type: 'DATE', allowNull: false, defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP') },
  updated_at: {
    type: 'DATE',
    allowNull: false,
    defaultValue: require('sequelize').literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
  },
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const companyFk = {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: { model: 'company_settings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    };

    if (!(await tableExists(queryInterface, 'prepaid_expense_categories'))) {
      await queryInterface.createTable('prepaid_expense_categories', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        category_code: { type: Sequelize.STRING(50), allowNull: false },
        category_name: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        default_prepaid_asset_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        default_expense_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        recognition_method: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'DAILY_CALENDAR_MONTH',
        },
        posting_mode: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'AUTO_CREATE_DRAFT_JV',
        },
        is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
        created_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        updated_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      });
    }

    await addIndexIfMissing(queryInterface, 'prepaid_expense_categories', ['company_id', 'category_code'], {
      unique: true,
      name: 'ppd_cat_company_code_unique',
    });

    if (!(await tableExists(queryInterface, 'prepaid_expenses'))) {
      await queryInterface.createTable('prepaid_expenses', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        prepaid_number: { type: Sequelize.STRING(50), allowNull: false },
        category_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'prepaid_expense_categories', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        description: { type: Sequelize.TEXT, allowNull: true },
        supplier_id: { type: Sequelize.INTEGER, allowNull: true },
        source_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'MANUAL' },
        source_document_id: { type: Sequelize.INTEGER, allowNull: true },
        source_document_number: { type: Sequelize.STRING(100), allowNull: true },
        purchase_invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'purchase_invoices', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        direct_purchase_invoice_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'direct_purchase_invoices', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        payment_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'payments', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        initial_journal_voucher_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'journal_vouchers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        currency_code: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'AED' },
        exchange_rate: { type: Sequelize.DECIMAL(15, 6), allowNull: false, defaultValue: 1 },
        total_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        base_currency_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        service_start_date: { type: Sequelize.DATEONLY, allowNull: false },
        service_end_date: { type: Sequelize.DATEONLY, allowNull: false },
        total_service_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        daily_rate: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
        recognition_method: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'DAILY_CALENDAR_MONTH',
        },
        posting_mode: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'AUTO_CREATE_DRAFT_JV',
        },
        prepaid_asset_account_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        expense_account_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        credit_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        cost_center_id: { type: Sequelize.INTEGER, allowNull: true },
        department_id: { type: Sequelize.INTEGER, allowNull: true },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'properties', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        unit_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'units', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        project_id: { type: Sequelize.INTEGER, allowNull: true },
        lease_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'leases', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        vendor_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'vendors', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        initial_posting_required: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        initial_posting_status: { type: Sequelize.STRING(40), allowNull: true },
        schedule_status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'NONE' },
        approval_status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
        recognized_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        remaining_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        suspended_from: { type: Sequelize.DATEONLY, allowNull: true },
        terminated_on: { type: Sequelize.DATEONLY, allowNull: true },
        termination_reason: { type: Sequelize.TEXT, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_test_data: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
        submitted_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        reviewed_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      });
    }

    await addIndexIfMissing(queryInterface, 'prepaid_expenses', ['company_id', 'prepaid_number'], {
      unique: true,
      name: 'ppd_exp_company_number_unique',
    });
    await addIndexIfMissing(queryInterface, 'prepaid_expenses', ['company_id', 'status'], {
      name: 'ppd_exp_company_status_idx',
    });

    if (!(await tableExists(queryInterface, 'prepaid_expense_posting_batches'))) {
      await queryInterface.createTable('prepaid_expense_posting_batches', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        batch_number: { type: Sequelize.STRING(50), allowNull: false },
        posting_date: { type: Sequelize.DATEONLY, allowNull: false },
        fiscal_period_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'company_financial_periods', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        posting_mode: { type: Sequelize.STRING(40), allowNull: false },
        line_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        total_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
        started_at: { type: Sequelize.DATE, allowNull: true },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
        approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        error_summary: { type: Sequelize.TEXT, allowNull: true },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'prepaid_expense_posting_batches', ['company_id', 'batch_number'], {
      unique: true,
      name: 'ppd_batch_company_number_unique',
    });

    if (!(await tableExists(queryInterface, 'prepaid_expense_schedule_lines'))) {
      await queryInterface.createTable('prepaid_expense_schedule_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        prepaid_expense_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'prepaid_expenses', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        line_number: { type: Sequelize.INTEGER, allowNull: false },
        fiscal_year: { type: Sequelize.INTEGER, allowNull: true },
        fiscal_period_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'company_financial_periods', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        recognition_month: { type: Sequelize.STRING(7), allowNull: false },
        period_start_date: { type: Sequelize.DATEONLY, allowNull: false },
        period_end_date: { type: Sequelize.DATEONLY, allowNull: false },
        service_days: { type: Sequelize.INTEGER, allowNull: false },
        daily_rate: { type: Sequelize.DECIMAL(18, 6), allowNull: false },
        scheduled_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
        base_scheduled_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        cumulative_recognized_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        remaining_balance_after_line: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        recognition_date: { type: Sequelize.DATEONLY, allowNull: true },
        due_date: { type: Sequelize.DATEONLY, allowNull: true },
        journal_voucher_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'journal_vouchers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        journal_voucher_number: { type: Sequelize.STRING(50), allowNull: true },
        posting_batch_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'prepaid_expense_posting_batches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        posting_status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'SCHEDULED' },
        approval_status: { type: Sequelize.STRING(40), allowNull: true },
        posted_at: { type: Sequelize.DATE, allowNull: true },
        posted_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        failure_code: { type: Sequelize.STRING(50), allowNull: true },
        failure_reason: { type: Sequelize.TEXT, allowNull: true },
        reversal_journal_voucher_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'journal_vouchers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        reversed_at: { type: Sequelize.DATE, allowNull: true },
        reversal_reason: { type: Sequelize.TEXT, allowNull: true },
        is_final_adjustment: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        is_locked: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'prepaid_expense_schedule_lines', ['prepaid_expense_id'], {
      name: 'ppd_sched_expense_idx',
    });
    await addIndexIfMissing(queryInterface, 'prepaid_expense_schedule_lines', ['company_id', 'posting_status'], {
      name: 'ppd_sched_company_status_idx',
    });

    if (!(await tableExists(queryInterface, 'prepaid_expense_allocations'))) {
      await queryInterface.createTable('prepaid_expense_allocations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        prepaid_expense_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'prepaid_expenses', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        allocation_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'CUSTOM' },
        property_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'properties', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        unit_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'units', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        project_id: { type: Sequelize.INTEGER, allowNull: true },
        department_id: { type: Sequelize.INTEGER, allowNull: true },
        cost_center_id: { type: Sequelize.INTEGER, allowNull: true },
        allocation_percentage: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
        allocation_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        expense_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        description: { type: Sequelize.STRING(500), allowNull: true },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'prepaid_expense_allocations', ['prepaid_expense_id'], {
      name: 'ppd_alloc_expense_idx',
    });

    if (!(await tableExists(queryInterface, 'prepaid_expense_amendments'))) {
      await queryInterface.createTable('prepaid_expense_amendments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        prepaid_expense_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'prepaid_expenses', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        amendment_number: { type: Sequelize.STRING(50), allowNull: false },
        amendment_type: { type: Sequelize.STRING(40), allowNull: false },
        requested_changes_json: { type: Sequelize.JSON, allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        effective_date: { type: Sequelize.DATEONLY, allowNull: false },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
        submitted_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
        approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'prepaid_expense_amendments', ['prepaid_expense_id'], {
      name: 'ppd_amend_expense_idx',
    });

    if (!(await tableExists(queryInterface, 'prepaid_expense_reconciliations'))) {
      await queryInterface.createTable('prepaid_expense_reconciliations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        prepaid_expense_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'prepaid_expenses', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        reconciliation_date: { type: Sequelize.DATEONLY, allowNull: false },
        original_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
        recognized_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        remaining_subledger_balance: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        prepaid_gl_balance: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        difference_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'EXCEPTION' },
        exception_reason: { type: Sequelize.TEXT, allowNull: true },
        resolved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        resolved_at: { type: Sequelize.DATE, allowNull: true },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'prepaid_expense_reconciliations', ['prepaid_expense_id'], {
      name: 'ppd_recon_expense_idx',
    });

    if (!(await tableExists(queryInterface, 'prepaid_expense_settings'))) {
      await queryInterface.createTable('prepaid_expense_settings', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          references: { model: 'company_settings', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        default_posting_mode: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'AUTO_CREATE_DRAFT_JV',
        },
        default_recognition_method: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'DAILY_CALENDAR_MONTH',
        },
        settings_json: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: JSON.stringify({
            posting_mode: 'AUTO_CREATE_DRAFT_JV',
            recognition_method: 'DAILY_CALENDAR_MONTH',
            tolerance: { amount: 0.01, reconciliation: 1.0 },
            scheduler_enabled: false,
            maker_checker_enforced: true,
          }),
        },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('prepaid_expense_reconciliations');
    await queryInterface.dropTable('prepaid_expense_amendments');
    await queryInterface.dropTable('prepaid_expense_allocations');
    await queryInterface.dropTable('prepaid_expense_schedule_lines');
    await queryInterface.dropTable('prepaid_expense_posting_batches');
    await queryInterface.dropTable('prepaid_expenses');
    await queryInterface.dropTable('prepaid_expense_categories');
    await queryInterface.dropTable('prepaid_expense_settings');
  },
};
