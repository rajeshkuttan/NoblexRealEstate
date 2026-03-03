const { sequelize } = require('../src/config/database');
const { QueryTypes } = require('sequelize');

async function updateSchema() {
  try {
    console.log('Starting schema update for payments table...');

    const columns = [
      { name: 'payment_type', type: 'VARCHAR(50) NULL' },
      { name: 'category', type: 'VARCHAR(50) NULL' },
      { name: 'subcategory', type: 'VARCHAR(50) NULL' },
      { name: 'property_name', type: 'VARCHAR(100) NULL' },
      { name: 'unit_number', type: 'VARCHAR(50) NULL' },
      { name: 'payee_name', type: 'VARCHAR(100) NULL' },
      { name: 'payee_type', type: 'VARCHAR(50) NULL' },
      { name: 'payee_id_string', type: 'VARCHAR(50) NULL' },
      { name: 'instrument_number', type: 'VARCHAR(50) NULL' },
      { name: 'instrument_date', type: 'DATE NULL' },
      { name: 'petty_cash_account', type: 'VARCHAR(100) NULL' },
      { name: 'bank_name', type: 'VARCHAR(100) NULL' },
      { name: 'processed_by_name', type: 'VARCHAR(100) NULL' },
      { name: 'approved_by_name', type: 'VARCHAR(100) NULL' },
      { name: 'tax_info', type: 'JSON NULL' }
    ];

    for (const col of columns) {
      try {
        await sequelize.query(`ALTER TABLE payments ADD COLUMN ${col.name} ${col.type}`, { type: QueryTypes.RAW });
        console.log(`Added column: ${col.name}`);
      } catch (err) {
        if (err.parent && err.parent.errno === 1060) {
          console.log(`Column ${col.name} already exists, skipping.`);
        } else {
          console.error(`Error adding column ${col.name}:`, err.message);
        }
      }
    }

    console.log('Schema update completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Schema update failed:', error);
    process.exit(1);
  }
}

updateSchema();
