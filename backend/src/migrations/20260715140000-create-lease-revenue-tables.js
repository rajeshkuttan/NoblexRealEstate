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

    if (!(await tableExists(queryInterface, 'lease_revenue_settings'))) {
      await queryInterface.createTable('lease_revenue_settings', {
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
        default_revenue_model: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'DEFERRED',
        },
        settings_json: {
          type: Sequelize.JSON,
          allowNull: false,
          defaultValue: JSON.stringify({
            posting_mode: 'AUTO_CREATE_DRAFT_JV',
            recognition_method: 'DAILY_CALENDAR_MONTH',
            revenue_model: 'DEFERRED',
            tolerance: { amount: 0.01, reconciliation: 1.0 },
            scheduler_enabled: false,
            maker_checker_enforced: true,
          }),
        },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    if (!(await tableExists(queryInterface, 'lease_revenue_posting_batches'))) {
      await queryInterface.createTable('lease_revenue_posting_batches', {
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

    await addIndexIfMissing(queryInterface, 'lease_revenue_posting_batches', ['company_id', 'batch_number'], {
      unique: true,
      name: 'lr_batch_company_number_unique',
    });

    if (!(await tableExists(queryInterface, 'lease_revenue_schedules'))) {
      await queryInterface.createTable('lease_revenue_schedules', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        lease_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'leases', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        tenant_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'tenants', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
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
        schedule_number: { type: Sequelize.STRING(50), allowNull: false },
        revenue_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'BASE_RENT' },
        revenue_model: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'DEFERRED',
        },
        recognition_method: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'DAILY_CALENDAR_MONTH',
        },
        source_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'LEASE' },
        total_contract_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        deferred_balance: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        recognized_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        remaining_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        revenue_account_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        deferred_revenue_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        receivable_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        accrued_revenue_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        currency_code: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'AED' },
        exchange_rate: { type: Sequelize.DECIMAL(15, 6), allowNull: false, defaultValue: 1 },
        service_start_date: { type: Sequelize.DATEONLY, allowNull: false },
        service_end_date: { type: Sequelize.DATEONLY, allowNull: false },
        total_service_days: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        daily_rate: { type: Sequelize.DECIMAL(18, 6), allowNull: false, defaultValue: 0 },
        schedule_status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'NONE' },
        approval_status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
        posting_mode: {
          type: Sequelize.STRING(40),
          allowNull: false,
          defaultValue: 'AUTO_CREATE_DRAFT_JV',
        },
        version_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_test_data: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
        submitted_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        terminated_on: { type: Sequelize.DATEONLY, allowNull: true },
        termination_reason: { type: Sequelize.TEXT, allowNull: true },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      });
    }

    await addIndexIfMissing(queryInterface, 'lease_revenue_schedules', ['company_id', 'schedule_number'], {
      unique: true,
      name: 'lr_sched_company_number_unique',
    });
    await addIndexIfMissing(queryInterface, 'lease_revenue_schedules', ['company_id', 'lease_id'], {
      name: 'lr_sched_company_lease_idx',
    });
    await addIndexIfMissing(queryInterface, 'lease_revenue_schedules', ['company_id', 'status'], {
      name: 'lr_sched_company_status_idx',
    });

    if (!(await tableExists(queryInterface, 'lease_revenue_components'))) {
      await queryInterface.createTable('lease_revenue_components', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        schedule_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'lease_revenue_schedules', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        component_code: { type: Sequelize.STRING(50), allowNull: false },
        component_name: { type: Sequelize.STRING(200), allowNull: false },
        lease_charge_id: { type: Sequelize.INTEGER, allowNull: true },
        service_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'services', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        revenue_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'OTHER' },
        revenue_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        deferred_revenue_account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'chart_of_accounts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        start_date: { type: Sequelize.DATEONLY, allowNull: false },
        end_date: { type: Sequelize.DATEONLY, allowNull: false },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'lease_revenue_components', ['schedule_id'], {
      name: 'lr_comp_schedule_idx',
    });

    if (!(await tableExists(queryInterface, 'lease_revenue_schedule_lines'))) {
      await queryInterface.createTable('lease_revenue_schedule_lines', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        schedule_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'lease_revenue_schedules', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        component_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'lease_revenue_components', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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
        recognition_days: { type: Sequelize.INTEGER, allowNull: false },
        daily_rate: { type: Sequelize.DECIMAL(18, 6), allowNull: false },
        scheduled_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
        base_scheduled_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        cumulative_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        remaining_balance: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
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
          references: { model: 'lease_revenue_posting_batches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        posting_status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'SCHEDULED' },
        schedule_version: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
        audit_reference: { type: Sequelize.STRING(100), allowNull: true },
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

    await addIndexIfMissing(queryInterface, 'lease_revenue_schedule_lines', ['schedule_id'], {
      name: 'lr_line_schedule_idx',
    });
    await addIndexIfMissing(queryInterface, 'lease_revenue_schedule_lines', ['company_id', 'posting_status'], {
      name: 'lr_line_company_status_idx',
    });

    if (!(await tableExists(queryInterface, 'lease_revenue_versions'))) {
      await queryInterface.createTable('lease_revenue_versions', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        schedule_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'lease_revenue_schedules', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        version_number: { type: Sequelize.INTEGER, allowNull: false },
        reason: { type: Sequelize.TEXT, allowNull: true },
        snapshot_json: { type: Sequelize.JSON, allowNull: true },
        created_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'lease_revenue_versions', ['schedule_id', 'version_number'], {
      unique: true,
      name: 'lr_ver_schedule_version_unique',
    });

    if (!(await tableExists(queryInterface, 'lease_revenue_adjustments'))) {
      await queryInterface.createTable('lease_revenue_adjustments', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        schedule_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'lease_revenue_schedules', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        adjustment_number: { type: Sequelize.STRING(50), allowNull: false },
        adjustment_type: { type: Sequelize.STRING(40), allowNull: false },
        effective_date: { type: Sequelize.DATEONLY, allowNull: false },
        amount: { type: Sequelize.DECIMAL(18, 2), allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'DRAFT' },
        requested_changes_json: { type: Sequelize.JSON, allowNull: true },
        submitted_by: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' } },
        approved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'lease_revenue_adjustments', ['schedule_id'], {
      name: 'lr_adj_schedule_idx',
    });

    if (!(await tableExists(queryInterface, 'lease_revenue_reconciliations'))) {
      await queryInterface.createTable('lease_revenue_reconciliations', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        company_id: companyFk,
        schedule_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'lease_revenue_schedules', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        reconciliation_date: { type: Sequelize.DATEONLY, allowNull: false },
        original_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        recognized_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        remaining_subledger_balance: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        deferred_gl_balance: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        difference_amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'EXCEPTION' },
        exception_reason: { type: Sequelize.TEXT, allowNull: true },
        resolved_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
        resolved_at: { type: Sequelize.DATE, allowNull: true },
        created_at: ts.created_at,
        updated_at: ts.updated_at,
      });
    }

    await addIndexIfMissing(queryInterface, 'lease_revenue_reconciliations', ['schedule_id'], {
      name: 'lr_recon_schedule_idx',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('lease_revenue_reconciliations');
    await queryInterface.dropTable('lease_revenue_adjustments');
    await queryInterface.dropTable('lease_revenue_versions');
    await queryInterface.dropTable('lease_revenue_schedule_lines');
    await queryInterface.dropTable('lease_revenue_components');
    await queryInterface.dropTable('lease_revenue_schedules');
    await queryInterface.dropTable('lease_revenue_posting_batches');
    await queryInterface.dropTable('lease_revenue_settings');
  },
};
