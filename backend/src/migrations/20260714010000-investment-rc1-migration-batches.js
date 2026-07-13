'use strict';

/** Investment 2.0 RC1 — migration batches, exceptions, pilot users, coexistence columns */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, BOOLEAN, DATE, DATEONLY, DECIMAL, ENUM, JSON } = Sequelize;

    await queryInterface.createTable('investment_migration_batches', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: true },
      batch_code: { type: STRING(80), allowNull: false },
      status: {
        type: ENUM(
          'DRAFT',
          'DRY_RUN',
          'VALIDATED',
          'RUNNING',
          'PARTIAL',
          'COMPLETED',
          'FAILED',
          'RECONCILED',
          'APPROVED',
          'ROLLED_BACK'
        ),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      mode: { type: STRING(20), allowNull: false, defaultValue: 'FULL' },
      dry_run: { type: BOOLEAN, allowNull: false, defaultValue: false },
      started_at: { type: DATE, allowNull: true },
      completed_at: { type: DATE, allowNull: true },
      started_by: { type: INTEGER, allowNull: true },
      summary_json: { type: JSON, allowNull: true },
      error_summary: { type: TEXT, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('investment_migration_batches', ['batch_code'], {
      unique: true,
      name: 'uq_inv_mig_batch_code',
    });
    await queryInterface.addIndex('investment_migration_batches', ['company_id', 'status'], {
      name: 'idx_inv_mig_batch_company_status',
    });

    await queryInterface.createTable('investment_migration_items', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      batch_id: { type: INTEGER, allowNull: false },
      company_id: { type: INTEGER, allowNull: false },
      source_type: { type: STRING(80), allowNull: false },
      source_id: { type: INTEGER, allowNull: true },
      target_type: { type: STRING(80), allowNull: true },
      target_id: { type: INTEGER, allowNull: true },
      status: {
        type: ENUM('PENDING', 'SKIPPED', 'MIGRATED', 'WARNING', 'FAILED', 'ROLLED_BACK'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      warning_count: { type: INTEGER, allowNull: false, defaultValue: 0 },
      error_details: { type: TEXT, allowNull: true },
      before_snapshot: { type: JSON, allowNull: true },
      after_snapshot: { type: JSON, allowNull: true },
      migrated_at: { type: DATE, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('investment_migration_items', ['batch_id', 'source_type', 'source_id'], {
      name: 'idx_inv_mig_item_source',
    });
    await queryInterface.addIndex('investment_migration_items', ['company_id', 'status'], {
      name: 'idx_inv_mig_item_company',
    });

    await queryInterface.createTable('investment_migration_exceptions', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      batch_id: { type: INTEGER, allowNull: false },
      company_id: { type: INTEGER, allowNull: false },
      item_id: { type: INTEGER, allowNull: true },
      severity: {
        type: ENUM('CRITICAL', 'MAJOR', 'MINOR'),
        allowNull: false,
        defaultValue: 'MAJOR',
      },
      category: { type: STRING(80), allowNull: false },
      result_class: {
        type: ENUM('MATCHED', 'MATCHED_WITHIN_TOLERANCE', 'WARNING', 'EXCEPTION', 'FAILED'),
        allowNull: false,
        defaultValue: 'EXCEPTION',
      },
      difference_category: {
        type: ENUM(
          'PRE_EXISTING_DIFFERENCE',
          'MIGRATION_DIFFERENCE',
          'TIMING_DIFFERENCE',
          'CONFIGURATION_DIFFERENCE',
          'UNMAPPED_LEGACY_RECORD',
          'MANUAL_REVIEW'
        ),
        allowNull: true,
      },
      source_type: { type: STRING(80), allowNull: true },
      source_id: { type: INTEGER, allowNull: true },
      message: { type: TEXT, allowNull: false },
      detail_json: { type: JSON, allowNull: true },
      resolved: { type: BOOLEAN, allowNull: false, defaultValue: false },
      resolution_notes: { type: TEXT, allowNull: true },
      resolved_at: { type: DATE, allowNull: true },
      resolved_by: { type: INTEGER, allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('investment_migration_exceptions', ['batch_id', 'severity', 'resolved'], {
      name: 'idx_inv_mig_exc_batch',
    });

    await queryInterface.createTable('investment_oms_pilot_users', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      company_id: { type: INTEGER, allowNull: false },
      user_id: { type: INTEGER, allowNull: false },
      is_active: { type: BOOLEAN, allowNull: false, defaultValue: true },
      notes: { type: STRING(255), allowNull: true },
      created_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('investment_oms_pilot_users', ['company_id', 'user_id'], {
      unique: true,
      name: 'uq_inv_oms_pilot_user',
    });

    // Coexistence: transaction_origin on legacy transactions
    const txnDesc = await queryInterface.describeTable('investment_transactions');
    if (!txnDesc.transaction_origin) {
      await queryInterface.addColumn('investment_transactions', 'transaction_origin', {
        type: ENUM('LEGACY', 'OMS', 'MIGRATION', 'API', 'IMPORT', 'CORPORATE_ACTION', 'SYSTEM'),
        allowNull: false,
        defaultValue: 'LEGACY',
      });
    }
    if (!txnDesc.external_reference) {
      await queryInterface.addColumn('investment_transactions', 'external_reference', {
        type: STRING(100),
        allowNull: true,
      });
    }
    if (!txnDesc.broker_reference) {
      await queryInterface.addColumn('investment_transactions', 'broker_reference', {
        type: STRING(100),
        allowNull: true,
      });
    }
    if (!txnDesc.legacy_entry_reason) {
      await queryInterface.addColumn('investment_transactions', 'legacy_entry_reason', {
        type: TEXT,
        allowNull: true,
      });
    }

    // lot_origin on position lots
    const lotDesc = await queryInterface.describeTable('investment_position_lots');
    if (!lotDesc.lot_origin) {
      await queryInterface.addColumn('investment_position_lots', 'lot_origin', {
        type: ENUM('TRADE', 'MIGRATION_OPENING', 'CORPORATE_ACTION', 'ADJUSTMENT', 'IMPORT'),
        allowNull: false,
        defaultValue: 'TRADE',
      });
    }
    if (!lotDesc.legacy_transaction_id) {
      await queryInterface.addColumn('investment_position_lots', 'legacy_transaction_id', {
        type: INTEGER,
        allowNull: true,
      });
    }
    if (!lotDesc.migration_notes) {
      await queryInterface.addColumn('investment_position_lots', 'migration_notes', {
        type: TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const txnDesc = await queryInterface.describeTable('investment_transactions').catch(() => ({}));
    if (txnDesc.legacy_entry_reason) await queryInterface.removeColumn('investment_transactions', 'legacy_entry_reason');
    if (txnDesc.broker_reference) await queryInterface.removeColumn('investment_transactions', 'broker_reference');
    if (txnDesc.external_reference) await queryInterface.removeColumn('investment_transactions', 'external_reference');
    if (txnDesc.transaction_origin) await queryInterface.removeColumn('investment_transactions', 'transaction_origin');

    const lotDesc = await queryInterface.describeTable('investment_position_lots').catch(() => ({}));
    if (lotDesc.migration_notes) await queryInterface.removeColumn('investment_position_lots', 'migration_notes');
    if (lotDesc.legacy_transaction_id) await queryInterface.removeColumn('investment_position_lots', 'legacy_transaction_id');
    if (lotDesc.lot_origin) await queryInterface.removeColumn('investment_position_lots', 'lot_origin');

    await queryInterface.dropTable('investment_oms_pilot_users');
    await queryInterface.dropTable('investment_migration_exceptions');
    await queryInterface.dropTable('investment_migration_items');
    await queryInterface.dropTable('investment_migration_batches');
  },
};
