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

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!(await tableExists(queryInterface, 'direct_purchase_invoices'))) {
    await queryInterface.createTable('direct_purchase_invoices', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      dpi_number: { type: Sequelize.STRING(50), allowNull: false },
      vendor_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'vendors', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      invoice_date: { type: Sequelize.DATEONLY, allowNull: false },
      due_date: { type: Sequelize.DATEONLY, allowNull: true },
      supplier_invoice_no: { type: Sequelize.STRING(100), allowNull: true },
      supplier_invoice_date: { type: Sequelize.DATEONLY, allowNull: true },
      currency: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'AED' },
      exchange_rate: { type: Sequelize.DECIMAL(15, 6), allowNull: false, defaultValue: 1 },
      subtotal_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      paid_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      outstanding_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('DRAFT', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'DRAFT',
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      transaction_no: { type: Sequelize.INTEGER, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
      },
      posted_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      posted_at: { type: Sequelize.DATE, allowNull: true },
      cancelled_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' } },
      cancelled_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    }

    await addIndexIfMissing(queryInterface, 'direct_purchase_invoices', ['company_id', 'dpi_number'], {
      unique: true,
      name: 'dpi_company_number_unique',
    });
    await addIndexIfMissing(queryInterface, 'direct_purchase_invoices', ['company_id', 'vendor_id'], {
      name: 'dpi_company_vendor_idx',
    });
    await addIndexIfMissing(queryInterface, 'direct_purchase_invoices', ['company_id', 'status'], {
      name: 'dpi_company_status_idx',
    });

    if (!(await tableExists(queryInterface, 'direct_purchase_invoice_lines'))) {
    await queryInterface.createTable('direct_purchase_invoice_lines', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      direct_purchase_invoice_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'direct_purchase_invoices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
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
      description: { type: Sequelize.STRING(500), allowNull: true },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      tax_code: { type: Sequelize.STRING(40), allowNull: true },
      tax_rate: { type: Sequelize.DECIMAL(8, 4), allowNull: false, defaultValue: 0 },
      tax_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      total_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
      input_tax_account_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'chart_of_accounts', key: 'id' },
      },
      cost_center_id: { type: Sequelize.INTEGER, allowNull: true },
      property_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'properties', key: 'id' },
      },
      unit_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'units', key: 'id' },
      },
      lease_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'leases', key: 'id' },
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });
    }

    await addIndexIfMissing(queryInterface, 'direct_purchase_invoice_lines', ['direct_purchase_invoice_id'], {
      name: 'dpi_lines_invoice_idx',
    });

    const atCols = await queryInterface.describeTable('accounts_trans');
    if (!atCols.direct_purchase_invoice_id) {
      await queryInterface.addColumn('accounts_trans', 'direct_purchase_invoice_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'direct_purchase_invoices', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }
  },

  down: async (queryInterface) => {
    const atCols = await queryInterface.describeTable('accounts_trans').catch(() => ({}));
    if (atCols.direct_purchase_invoice_id) {
      await queryInterface.removeColumn('accounts_trans', 'direct_purchase_invoice_id');
    }
    await queryInterface.dropTable('direct_purchase_invoice_lines');
    await queryInterface.dropTable('direct_purchase_invoices');
  },
};
