'use strict';

const DOCUMENT_TYPES = [
  'invoice',
  'receipt',
  'payment',
  'journal_voucher',
  'purchase_order',
  'purchase_invoice',
  'vendor_invoice',
  'cheque',
  'lease',
  'property',
  'tenant',
  'budget',
  'legal',
  'helpdesk',
  'goods_receipt',
];

const GLOBAL_DOC_MAP = {
  'Receipt Invoice': 'invoice',
  'Receipt': 'receipt',
  'Payment Voucher': 'payment',
  'Journal Voucher': 'journal_voucher',
  'Purchase Order': 'purchase_order',
  'Purchase Invoice': 'purchase_invoice',
  'Lease': 'lease',
  'Legal': 'legal',
  'Helpdesk': 'helpdesk',
  'Goods Receipt Note': 'goods_receipt',
};

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

/** @param {import('sequelize').QueryInterface} queryInterface */
async function seedNumberSeries(queryInterface) {
  const [existing] = await queryInterface.sequelize.query(
    'SELECT COUNT(*) AS cnt FROM company_number_series'
  );
  if (existing[0]?.cnt > 0) return;
  const [companies] = await queryInterface.sequelize.query(
    `SELECT id FROM company_settings WHERE is_active = 1`
  );
  const [globalRows] = await queryInterface.sequelize.query(
    `SELECT document_name, prefix, suffix, current_number, is_active FROM document_numbering WHERE is_active = 1`
  );
  const now = new Date();
  for (const company of companies) {
    for (const docType of DOCUMENT_TYPES) {
      const match = globalRows.find((r) => GLOBAL_DOC_MAP[r.document_name] === docType);
      const prefix =
        match?.prefix ||
        {
          invoice: 'INV',
          receipt: 'REC',
          payment: 'PAY',
          journal_voucher: 'JV',
          purchase_order: 'PO',
          purchase_invoice: 'PI',
          vendor_invoice: 'VI',
          cheque: 'CHQ',
          lease: 'L',
          budget: 'BUD',
          legal: 'LEG',
          helpdesk: 'TKT',
          goods_receipt: 'GR',
        }[docType] ||
        'DOC';
      await queryInterface.bulkInsert('company_number_series', [
        {
          company_id: company.id,
          document_type: docType,
          prefix,
          suffix: match?.suffix || null,
          current_number: match?.current_number || 0,
          padding: 4,
          reset_type: 'yearly',
          is_active: 1,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'company_number_series'))) {
    await queryInterface.createTable('company_number_series', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      document_type: { type: Sequelize.STRING(50), allowNull: false },
      prefix: { type: Sequelize.STRING(20), allowNull: true },
      suffix: { type: Sequelize.STRING(20), allowNull: true },
      current_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      padding: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 4 },
      reset_type: {
        type: Sequelize.ENUM('never', 'daily', 'monthly', 'yearly'),
        allowNull: false,
        defaultValue: 'yearly',
      },
      last_reset_key: { type: Sequelize.STRING(20), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    }
    await addIndexIfMissing(queryInterface, 'company_number_series', ['company_id', 'document_type'], {
      unique: true,
      name: 'uq_company_number_series_company_doc_type',
    });

    if (!(await tableExists(queryInterface, 'company_financial_years'))) {
    await queryInterface.createTable('company_financial_years', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      year_name: { type: Sequelize.STRING(50), allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      is_current: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_closed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    }
    await addIndexIfMissing(queryInterface, 'company_financial_years', ['company_id'], {
      name: 'idx_company_financial_years_company',
    });

    if (!(await tableExists(queryInterface, 'company_financial_periods'))) {
    await queryInterface.createTable('company_financial_periods', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      financial_year_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_financial_years', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      period_no: { type: Sequelize.INTEGER, allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('OPEN', 'SOFT_CLOSED', 'HARD_CLOSED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      closed_by: { type: Sequelize.INTEGER, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    }
    await addIndexIfMissing(queryInterface, 'company_financial_periods', ['company_id', 'start_date', 'end_date'], {
      name: 'idx_company_financial_periods_company_dates',
    });

    if (!(await tableExists(queryInterface, 'company_vat_periods'))) {
    await queryInterface.createTable('company_vat_periods', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      period_name: { type: Sequelize.STRING(100), allowNull: false },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('OPEN', 'LOCKED', 'SUBMITTED'),
        allowNull: false,
        defaultValue: 'OPEN',
      },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      submitted_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    }
    await addIndexIfMissing(queryInterface, 'company_vat_periods', ['company_id', 'start_date', 'end_date'], {
      name: 'idx_company_vat_periods_company_dates',
    });

    if (!(await tableExists(queryInterface, 'company_document_templates'))) {
    await queryInterface.createTable('company_document_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      document_type: { type: Sequelize.STRING(50), allowNull: false },
      header_template: { type: Sequelize.TEXT, allowNull: true },
      footer_template: { type: Sequelize.TEXT, allowNull: true },
      logo: { type: Sequelize.STRING(255), allowNull: true },
      signature: { type: Sequelize.STRING(255), allowNull: true },
      stamp: { type: Sequelize.STRING(255), allowNull: true },
      show_trn: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      show_bank: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    }
    await addIndexIfMissing(queryInterface, 'company_document_templates', ['company_id', 'document_type'], {
      unique: true,
      name: 'uq_company_document_templates_company_doc',
    });

    if (!(await tableExists(queryInterface, 'company_opening_balance_batches'))) {
    await queryInterface.createTable('company_opening_balance_batches', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'company_settings', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      batch_name: { type: Sequelize.STRING(100), allowNull: false },
      balance_date: { type: Sequelize.DATEONLY, allowNull: false },
      status: {
        type: Sequelize.ENUM('draft', 'posted', 'locked'),
        allowNull: false,
        defaultValue: 'draft',
      },
      created_by: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    }
    await addIndexIfMissing(queryInterface, 'company_opening_balance_batches', ['company_id'], {
      name: 'idx_opening_balance_batches_company',
    });

    await seedNumberSeries(queryInterface);

    const [companies] = await queryInterface.sequelize.query(
      `SELECT id, fiscal_year_start, fiscal_year_end FROM company_settings WHERE is_active = 1`
    );
    const now = new Date();
    const year = now.getFullYear();
    for (const c of companies) {
      const [fyExisting] = await queryInterface.sequelize.query(
        `SELECT id FROM company_financial_years WHERE company_id = :cid LIMIT 1`,
        { replacements: { cid: c.id } }
      );
      if (fyExisting.length > 0) continue;
      const start = c.fiscal_year_start || `${year}-01-01`;
      const end = c.fiscal_year_end || `${year}-12-31`;
      await queryInterface.bulkInsert('company_financial_years', [
        {
          company_id: c.id,
          year_name: `FY ${year}`,
          start_date: start,
          end_date: end,
          is_current: 1,
          is_closed: 0,
          created_at: now,
          updated_at: now,
        },
      ]);
      const [fyRows] = await queryInterface.sequelize.query(
        `SELECT id FROM company_financial_years WHERE company_id = :cid ORDER BY id DESC LIMIT 1`,
        { replacements: { cid: c.id } }
      );
      if (fyRows[0]) {
        await queryInterface.bulkInsert('company_financial_periods', [
          {
            financial_year_id: fyRows[0].id,
            company_id: c.id,
            period_no: 1,
            start_date: start,
            end_date: end,
            status: 'OPEN',
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('company_opening_balance_batches');
    await queryInterface.dropTable('company_document_templates');
    await queryInterface.dropTable('company_vat_periods');
    await queryInterface.dropTable('company_financial_periods');
    await queryInterface.dropTable('company_financial_years');
    await queryInterface.dropTable('company_number_series');
  },
};
