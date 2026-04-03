const { sequelize } = require('./backend/src/config/database');

async function alterTable() {
  try {
    await sequelize.query('ALTER TABLE units ADD COLUMN special_notes TEXT;');
    console.log('Added special_notes successfully');
  } catch(e) {
    if (e.message.includes('Duplicate column name')) {
       console.log('Column already exists');
    } else {
       console.log('Error:', e.message);
    }
  } finally {
    process.exit(0);
  }
}
alterTable();
