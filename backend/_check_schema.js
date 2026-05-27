require('dotenv').config({ path: './config.env' });
const { sequelize } = require('./src/models');

(async () => {
  try {
    const [r] = await sequelize.query("SHOW COLUMNS FROM leases WHERE Field='status'");
    console.log('Lease status enum:', JSON.stringify(r));
    const [u] = await sequelize.query("SHOW COLUMNS FROM units WHERE Field='status'");
    console.log('Unit status enum:', JSON.stringify(u));
    const [cnt] = await sequelize.query('SELECT status, COUNT(*) as c FROM units GROUP BY status');
    console.log('Unit status counts:', JSON.stringify(cnt));
    const [leaseCnt] = await sequelize.query('SELECT COUNT(*) as c FROM leases');
    console.log('Lease count:', JSON.stringify(leaseCnt));
  } catch (e) {
    console.error(e.message);
  } finally {
    await sequelize.close();
  }
})();
