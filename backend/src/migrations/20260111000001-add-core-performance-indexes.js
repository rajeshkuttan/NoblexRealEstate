'use strict';

/**
 * Core Performance Optimization Migration
 * Adds essential database indexes for frequently queried columns
 * Part of: Phase 6.4 - Performance Optimization
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('Adding core performance indexes...');

    // Helper function to add index with error handling
    const addIndexSafely = async (table, columns, options) => {
      try {
        await queryInterface.addIndex(table, columns, options);
        console.log(`✓ Added index ${options.name} on ${table}`);
      } catch (error) {
        if (error.message.includes('Duplicate key name') || error.message.includes('already exists')) {
          console.log(`⊘ Index ${options.name} already exists on ${table}, skipping`);
        } else {
          console.warn(`⚠ Warning: Could not add index ${options.name} on ${table}: ${error.message}`);
        }
      }
    };

    // Properties indexes
    await addIndexSafely('properties', ['emirate'], {
      name: 'idx_properties_emirate'
    });
    await addIndexSafely('properties', ['building_type'], {
      name: 'idx_properties_building_type'
    });

    // Units indexes
    await addIndexSafely('units', ['property_id', 'status'], { name: 'idx_units_property_status' });
    await addIndexSafely('units', ['status'], { name: 'idx_units_status' });

    // Tenants indexes
    await addIndexSafely('tenants', ['emirates_id'], { name: 'idx_tenants_emirates_id' });
    await addIndexSafely('tenants', ['phone'], { name: 'idx_tenants_phone' });

    // Leases indexes
    await addIndexSafely('leases', ['tenant_id', 'status'], { name: 'idx_leases_tenant_status' });
    await addIndexSafely('leases', ['unit_id', 'status'], { name: 'idx_leases_unit_status' });
    await addIndexSafely('leases', ['status'], { name: 'idx_leases_status' });
    await addIndexSafely('leases', ['start_date', 'end_date'], { name: 'idx_leases_dates' });
    await addIndexSafely('leases', ['end_date'], { name: 'idx_leases_end_date' });

    // Invoices indexes
    await addIndexSafely('invoices', ['tenant_id', 'status'], { name: 'idx_invoices_tenant_status' });
    await addIndexSafely('invoices', ['lease_id', 'status'], { name: 'idx_invoices_lease_status' });
    await addIndexSafely('invoices', ['status'], { name: 'idx_invoices_status' });
    await addIndexSafely('invoices', ['due_date'], { name: 'idx_invoices_due_date' });
    await addIndexSafely('invoices', ['invoice_date'], { name: 'idx_invoices_invoice_date' });

    // Payments indexes
    await addIndexSafely('payments', ['lease_id', 'status'], { name: 'idx_payments_lease_status' });
    await addIndexSafely('payments', ['status'], { name: 'idx_payments_status' });
    await addIndexSafely('payments', ['payment_date'], { name: 'idx_payments_payment_date' });
    await addIndexSafely('payments', ['payment_method'], { name: 'idx_payments_method' });

    // Financial Transactions indexes
    await addIndexSafely('financial_transactions', ['property_id', 'transaction_date'], { name: 'idx_ft_property_date' });
    await addIndexSafely('financial_transactions', ['transaction_type', 'transaction_date'], { name: 'idx_ft_type_date' });
    await addIndexSafely('financial_transactions', ['account_id'], { name: 'idx_ft_account' });
    await addIndexSafely('financial_transactions', ['status'], { name: 'idx_ft_status' });

    // Vendor Invoices indexes
    await addIndexSafely('vendor_invoices', ['vendor_id', 'status'], { name: 'idx_vendor_invoices_vendor_status' });
    await addIndexSafely('vendor_invoices', ['status'], { name: 'idx_vendor_invoices_status' });
    await addIndexSafely('vendor_invoices', ['due_date'], { name: 'idx_vendor_invoices_due_date' });
    await addIndexSafely('vendor_invoices', ['property_id'], { name: 'idx_vendor_invoices_property' });

    // Vendors indexes
    await addIndexSafely('vendors', ['category'], { name: 'idx_vendors_category' });
    await addIndexSafely('vendors', ['is_active'], { name: 'idx_vendors_is_active' });

    // Tickets indexes
    await addIndexSafely('tickets', ['tenant_id', 'status'], { name: 'idx_tickets_tenant_status' });
    await addIndexSafely('tickets', ['unit_id', 'status'], { name: 'idx_tickets_unit_status' });
    await addIndexSafely('tickets', ['status'], { name: 'idx_tickets_status' });
    await addIndexSafely('tickets', ['priority'], { name: 'idx_tickets_priority' });
    await addIndexSafely('tickets', ['assigned_to'], { name: 'idx_tickets_assigned_to' });

    // Chart of Accounts indexes
    await addIndexSafely('chart_of_accounts', ['account_type'], { name: 'idx_coa_account_type' });
    await addIndexSafely('chart_of_accounts', ['parent_id'], { name: 'idx_coa_parent_id' });
    await addIndexSafely('chart_of_accounts', ['is_active'], { name: 'idx_coa_is_active' });

    // Budgets indexes
    await addIndexSafely('budgets', ['property_id', 'period_start', 'period_end'], { name: 'idx_budgets_property_period' });
    await addIndexSafely('budgets', ['status'], { name: 'idx_budgets_status' });

    // Bank Accounts indexes
    await addIndexSafely('bank_accounts', ['account_type'], { name: 'idx_bank_accounts_type' });
    await addIndexSafely('bank_accounts', ['is_active'], { name: 'idx_bank_accounts_is_active' });

    // Bank Transactions indexes
    await addIndexSafely('bank_transactions', ['bank_account_id', 'transaction_date'], { name: 'idx_bank_txn_account_date' });
    await addIndexSafely('bank_transactions', ['transaction_type'], { name: 'idx_bank_txn_type' });
    await addIndexSafely('bank_transactions', ['status'], { name: 'idx_bank_txn_status' });

    console.log('\n✅ Core performance indexes migration completed successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove all indexes
    const indexes = [
      // Properties
      { table: 'properties', name: 'idx_properties_emirate' },
      { table: 'properties', name: 'idx_properties_building_type' },
      // Units
      { table: 'units', name: 'idx_units_property_status' },
      { table: 'units', name: 'idx_units_status' },
      // Tenants
      { table: 'tenants', name: 'idx_tenants_emirates_id' },
      { table: 'tenants', name: 'idx_tenants_phone' },
      // Leases
      { table: 'leases', name: 'idx_leases_tenant_status' },
      { table: 'leases', name: 'idx_leases_unit_status' },
      { table: 'leases', name: 'idx_leases_status' },
      { table: 'leases', name: 'idx_leases_dates' },
      { table: 'leases', name: 'idx_leases_end_date' },
      // Invoices
      { table: 'invoices', name: 'idx_invoices_tenant_status' },
      { table: 'invoices', name: 'idx_invoices_lease_status' },
      { table: 'invoices', name: 'idx_invoices_status' },
      { table: 'invoices', name: 'idx_invoices_due_date' },
      { table: 'invoices', name: 'idx_invoices_invoice_date' },
      // Payments
      { table: 'payments', name: 'idx_payments_lease_status' },
      { table: 'payments', name: 'idx_payments_status' },
      { table: 'payments', name: 'idx_payments_payment_date' },
      { table: 'payments', name: 'idx_payments_method' },
      // Financial Transactions
      { table: 'financial_transactions', name: 'idx_ft_property_date' },
      { table: 'financial_transactions', name: 'idx_ft_type_date' },
      { table: 'financial_transactions', name: 'idx_ft_account' },
      { table: 'financial_transactions', name: 'idx_ft_status' },
      // Vendor Invoices
      { table: 'vendor_invoices', name: 'idx_vendor_invoices_vendor_status' },
      { table: 'vendor_invoices', name: 'idx_vendor_invoices_status' },
      { table: 'vendor_invoices', name: 'idx_vendor_invoices_due_date' },
      { table: 'vendor_invoices', name: 'idx_vendor_invoices_property' },
      // Vendors
      { table: 'vendors', name: 'idx_vendors_category' },
      { table: 'vendors', name: 'idx_vendors_is_active' },
      // Tickets
      { table: 'tickets', name: 'idx_tickets_tenant_status' },
      { table: 'tickets', name: 'idx_tickets_unit_status' },
      { table: 'tickets', name: 'idx_tickets_status' },
      { table: 'tickets', name: 'idx_tickets_priority' },
      { table: 'tickets', name: 'idx_tickets_assigned_to' },
      // Chart of Accounts
      { table: 'chart_of_accounts', name: 'idx_coa_account_type' },
      { table: 'chart_of_accounts', name: 'idx_coa_parent_id' },
      { table: 'chart_of_accounts', name: 'idx_coa_is_active' },
      // Budgets
      { table: 'budgets', name: 'idx_budgets_property_period' },
      { table: 'budgets', name: 'idx_budgets_status' },
      // Bank Accounts
      { table: 'bank_accounts', name: 'idx_bank_accounts_type' },
      { table: 'bank_accounts', name: 'idx_bank_accounts_is_active' },
      // Bank Transactions
      { table: 'bank_transactions', name: 'idx_bank_txn_account_date' },
      { table: 'bank_transactions', name: 'idx_bank_txn_type' },
      { table: 'bank_transactions', name: 'idx_bank_txn_status' }
    ];

    for (const index of indexes) {
      try {
        await queryInterface.removeIndex(index.table, index.name);
      } catch (error) {
        console.warn(`Warning: Could not remove index ${index.name} from ${index.table}`);
      }
    }

    console.log('✅ Core performance indexes removed');
  }
};
