const { sequelize } = require('./backend/src/config/database');

async function alterTable() {
  try {
    await sequelize.query('ALTER TABLE units ADD COLUMN special_notes TEXT;');
    console.log('Added special_notes successfully');
  } catch(e) {
    console.log('Error:', e.message);
  }
}
alterTable();
