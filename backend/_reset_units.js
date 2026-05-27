require('dotenv').config({ path: './config.env' });
const { sequelize } = require('./src/models');

(async () => {
  try {
    const [result] = await sequelize.query(
      "UPDATE units SET status = 'available' WHERE status = 'occupied'"
    );
    console.log('Reset occupied units to available. Affected:', result.affectedRows || result.info);
    const [cnt] = await sequelize.query('SELECT status, COUNT(*) as c FROM units GROUP BY status');
    console.log('Unit status counts now:', JSON.stringify(cnt));
  } catch (e) {
    console.error(e.message);
  } finally {
    await sequelize.close();
  }
})();
