const { sequelize } = require('./src/config/database');
(async () => {
  const [rows] = await sequelize.query("SELECT COUNT(*) AS invalid_count FROM tickets t LEFT JOIN vendors v ON t.vendor_id = v.id WHERE t.vendor_id IS NOT NULL AND v.id IS NULL");
  console.log(JSON.stringify(rows[0], null, 2));
  await sequelize.close();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
