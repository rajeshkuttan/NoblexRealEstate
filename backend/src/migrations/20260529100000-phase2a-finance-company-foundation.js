'use strict';

/** @param {import('sequelize').QueryInterface} queryInterface */
async function getDefaultCompanyId(queryInterface) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM company_settings WHERE is_active = 1 ORDER BY id ASC LIMIT 1`
  );
  if (rows && rows.length > 0) return rows[0].id;

  const now = new Date();
  await queryInterface.bulkInsert('company_settings', [
    {
      company_name: 'Default Company',
      currency: 'AED',
      timezone: 'Asia/Dubai',
      language: 'en',
      country: 'UAE',
      is_active: 1,
      contract_terminology: 'Ejari',
      created_at: now,
      updated_at: now,
    },
  ]);
  const [created] = await queryInterface.sequelize.query(
    `SELECT id FROM company_settings ORDER BY id DESC LIMIT 1`
  );
  return created[0].id;
}

async function addCompanyIdColumn(queryInterface, Sequelize, table, defaultCompanyId) {
  const [cols] = await queryInterface.sequelize.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'company_id'`,
    { replacements: [table] }
  );
  if (cols.length > 0) return;

  await queryInterface.sequelize.query(
    `ALTER TABLE \`${table}\` ADD COLUMN company_id INT NULL`
  );
  await queryInterface.sequelize.query(
    `UPDATE \`${table}\` SET company_id = :companyId WHERE company_id IS NULL`,
    { replacements: { companyId: defaultCompanyId } }
  );
  await queryInterface.sequelize.query(
    `ALTER TABLE \`${table}\` MODIFY COLUMN company_id INT NOT NULL`
  );
  await queryInterface.addIndex(table, ['company_id'], {
    name: `idx_${table}_company_id`,
  }).catch(() => {});
  const fkName = `fk_${table}_company_id`;
  await queryInterface.sequelize.query(
    `ALTER TABLE \`${table}\`
     ADD CONSTRAINT \`${fkName}\`
     FOREIGN KEY (company_id) REFERENCES company_settings(id)
     ON UPDATE CASCADE ON DELETE RESTRICT`
  ).catch(() => {});
}

async function dropSingleColumnUniqueIndexes(queryInterface, table, columnName) {
  const [indexes] = await queryInterface.sequelize.query(`SHOW INDEX FROM \`${table}\``);
  const byKey = {};
  for (const row of indexes) {
    if (row.Key_name === 'PRIMARY') continue;
    if (!byKey[row.Key_name]) byKey[row.Key_name] = [];
    byKey[row.Key_name].push(row);
  }
  for (const [keyName, rows] of Object.entries(byKey)) {
    if (rows.length === 1 && rows[0].Column_name === columnName && rows[0].Non_unique === 0) {
      await queryInterface.removeIndex(table, keyName).catch(() => {});
    }
  }
}

async function addCompositeUnique(queryInterface, table, indexName, columns) {
  await queryInterface.addIndex(table, columns, {
    unique: true,
    name: indexName,
  }).catch(() => {});
}

const FINANCE_TABLES = [
  'chart_of_accounts',
  'ledger_setups',
  'bank_accounts',
  'vendors',
  'budgets',
  'budget_categories',
  'journal_vouchers',
  'journal_voucher_details',
  'cheques',
  'payments',
  'payment_invoice_allocations',
  'invoices',
  'vendor_invoices',
  'security_deposits',
  'accounts_trans',
  'financial_transactions',
  'purchase_orders',
  'purchase_invoices',
  'bank_transactions',
  'reconciliations',
  'bank_statement_imports',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    const defaultCompanyId = await getDefaultCompanyId(queryInterface);

    for (const table of FINANCE_TABLES) {
      await addCompanyIdColumn(queryInterface, Sequelize, table, defaultCompanyId);
    }

    await queryInterface.sequelize.query(
      `UPDATE budget_categories bc
       INNER JOIN budgets b ON b.id = bc.budget_id
       SET bc.company_id = b.company_id
       WHERE bc.company_id IS NULL OR bc.company_id != b.company_id`
    );

    await queryInterface.sequelize.query(
      `UPDATE journal_voucher_details jvd
       INNER JOIN journal_vouchers jv ON jv.id = jvd.jv_id
       SET jvd.company_id = jv.company_id
       WHERE jvd.company_id IS NULL OR jvd.company_id != jv.company_id`
    );

    await queryInterface.sequelize.query(
      `UPDATE payment_invoice_allocations pia
       INNER JOIN payments p ON p.id = pia.payment_id
       SET pia.company_id = p.company_id
       WHERE pia.company_id IS NULL OR pia.company_id != p.company_id`
    );

    await dropSingleColumnUniqueIndexes(queryInterface, 'chart_of_accounts', 'account_code');
    await addCompositeUnique(queryInterface, 'chart_of_accounts', 'uq_coa_company_account_code', [
      'company_id',
      'account_code',
    ]);

    await dropSingleColumnUniqueIndexes(queryInterface, 'bank_accounts', 'account_number');
    await dropSingleColumnUniqueIndexes(queryInterface, 'bank_accounts', 'iban');
    await addCompositeUnique(queryInterface, 'bank_accounts', 'uq_bank_company_account_number', [
      'company_id',
      'account_number',
    ]);

    await dropSingleColumnUniqueIndexes(queryInterface, 'vendors', 'email');
    await dropSingleColumnUniqueIndexes(queryInterface, 'vendors', 'trn');
    await addCompositeUnique(queryInterface, 'vendors', 'uq_vendor_company_email', ['company_id', 'email']);
    await addCompositeUnique(queryInterface, 'vendors', 'uq_vendor_company_trn', ['company_id', 'trn']);

    const uniqueNumberTables = [
      { table: 'journal_vouchers', column: 'jv_number', name: 'uq_jv_company_number' },
      { table: 'payments', column: 'payment_number', name: 'uq_payment_company_number' },
      { table: 'invoices', column: 'invoice_number', name: 'uq_invoice_company_number' },
      { table: 'vendor_invoices', column: 'invoice_number', name: 'uq_vendor_inv_company_number' },
      { table: 'financial_transactions', column: 'transaction_number', name: 'uq_fin_tx_company_number' },
      { table: 'accounts_trans', column: 'transaction_no', name: 'uq_accounts_trans_company_no' },
      { table: 'purchase_orders', column: 'po_number', name: 'uq_po_company_number' },
      { table: 'purchase_invoices', column: 'invoice_number', name: 'uq_pi_company_number' },
      { table: 'security_deposits', column: 'deposit_number', name: 'uq_sd_company_number' },
    ];

    for (const { table, column, name } of uniqueNumberTables) {
      await dropSingleColumnUniqueIndexes(queryInterface, table, column);
      await addCompositeUnique(queryInterface, table, name, ['company_id', column]);
    }
  },

  async down(queryInterface) {
    const compositeIndexes = [
      ['chart_of_accounts', 'uq_coa_company_account_code'],
      ['bank_accounts', 'uq_bank_company_account_number'],
      ['vendors', 'uq_vendor_company_email'],
      ['vendors', 'uq_vendor_company_trn'],
      ['journal_vouchers', 'uq_jv_company_number'],
      ['payments', 'uq_payment_company_number'],
      ['invoices', 'uq_invoice_company_number'],
      ['vendor_invoices', 'uq_vendor_inv_company_number'],
      ['financial_transactions', 'uq_fin_tx_company_number'],
      ['accounts_trans', 'uq_accounts_trans_company_no'],
      ['purchase_orders', 'uq_po_company_number'],
      ['purchase_invoices', 'uq_pi_company_number'],
      ['security_deposits', 'uq_sd_company_number'],
    ];
    for (const [table, idx] of compositeIndexes) {
      await queryInterface.removeIndex(table, idx).catch(() => {});
    }

    for (const table of [...FINANCE_TABLES].reverse()) {
      await queryInterface.removeIndex(table, `idx_${table}_company_id`).catch(() => {});
      await queryInterface.removeColumn(table, 'company_id').catch(() => {});
    }
  },
};
