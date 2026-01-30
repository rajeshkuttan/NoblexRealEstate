const { sequelize } = require('../models');

async function run() {
  try {
    const [results] = await sequelize.query("SHOW COLUMNS FROM cheques LIKE 'invoice_id'");
    if (results.length === 0) {
      console.log('Adding invoice_id column...');
      await sequelize.query("ALTER TABLE cheques ADD COLUMN invoice_id INTEGER NULL REFERENCES invoices(id) ON DELETE SET NULL ON UPDATE CASCADE");
      
      // Index creation might differ by DB, but for MySQL/Postgres usually ok. 
      // Safest is to try it.
      try {
          await sequelize.query("CREATE INDEX idx_cheques_invoice_id ON cheques(invoice_id)");
      } catch (e) {
          console.log("Index creation might have failed or exists:", e.message);
      }
      
      console.log('Column added.');
    } else {
      console.log('Column invoice_id already exists.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
