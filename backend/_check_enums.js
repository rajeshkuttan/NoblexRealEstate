require('dotenv').config({ path: './config.env' });
const { sequelize } = require('./src/models');

(async () => {
  try {
    const [r] = await sequelize.query(`
      SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND COLUMN_NAME = 'status' 
        AND COLUMN_TYPE LIKE 'enum%'
      ORDER BY TABLE_NAME
    `);
    r.forEach(c => console.log(c.TABLE_NAME, ':', c.COLUMN_TYPE));
  } catch (e) {
    console.error(e.message);
  } finally {
    await sequelize.close();
  }
})();
