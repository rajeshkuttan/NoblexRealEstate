require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const mysql = require('mysql2/promise');

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  const [meta] = await c.query('SELECT name FROM SequelizeMeta ORDER BY name');
  console.log('SequelizeMeta count:', meta.length);
  if (meta.length) {
    console.log('First:', meta[0].name);
    console.log('Last:', meta[meta.length - 1].name);
  }
  const [tables] = await c.query("SHOW TABLES LIKE 'vendors'");
  console.log('vendors exists:', tables.length > 0);
  if (tables.length) {
    const [idx] = await c.query("SHOW INDEX FROM vendors WHERE Key_name = 'idx_vendor_name'");
    console.log('idx_vendor_name exists:', idx.length > 0);
  }
  const phaseDTables = [
    'company_number_series',
    'company_financial_years',
    'company_financial_periods',
    'company_vat_periods',
    'company_document_templates',
    'company_opening_balance_batches',
  ];
  for (const t of phaseDTables) {
    const [r] = await c.query(`SHOW TABLES LIKE '${t}'`);
    console.log(`${t}:`, r.length > 0 ? 'yes' : 'no');
  }
  const fs = require('fs');
  const path = require('path');
  const migDir = path.join(__dirname, '../src/migrations');
  const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.js')).sort();
  const recorded = new Set(meta.map((r) => r.name));
  const pending = files.filter((f) => !recorded.has(f));
  console.log('Pending migrations:', pending.length);
  console.log('Next pending:', pending.slice(0, 5).join(', '));
  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
