require('dotenv').config({ path: './config.env' });
const { sequelize } = require('./src/models');

(async () => {
  try {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    const [l] = await sequelize.query('SELECT COUNT(*) as c FROM leases');
    console.log('Leases:', l[0].c);
    if (parseInt(l[0].c) > 0) {
      await sequelize.query('DELETE FROM leases');
      console.log('Deleted leases');
    }
    await sequelize.query("UPDATE units SET status = 'available' WHERE status = 'occupied'");
    console.log('Reset occupied units');
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    const [cnt] = await sequelize.query('SELECT status, COUNT(*) as c FROM units GROUP BY status');
    console.log('Unit status:', JSON.stringify(cnt));
  } catch (e) {
    console.error(e.message);
  } finally {
    await sequelize.close();
  }
})();
