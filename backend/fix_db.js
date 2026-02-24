const mysql = require('mysql2/promise');
const config = require('./src/config/config');

async function fix() {
  try {
    const conn = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.name
    });
    
    await conn.query("ALTER TABLE journal_vouchers MODIFY COLUMN status ENUM('open', 'posted', 'cancelled', 'draft') DEFAULT 'open'");
    console.log('Successfully updated status ENUM in journal_vouchers table.');
    
    await conn.end();
  } catch (error) {
    console.error('Error updating table:', error);
  }
}

fix();
