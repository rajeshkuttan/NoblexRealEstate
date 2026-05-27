/**
 * One-time fix when the DB schema already exists but SequelizeMeta is incomplete.
 * Marks every migration file in src/migrations as applied (INSERT IGNORE).
 *
 * Usage: node scripts/baseline-sequelize-meta.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

(async () => {
  const migDir = path.join(__dirname, '../src/migrations');
  const files = fs
    .readdirSync(migDir)
    .filter((f) => f.endsWith('.js'))
    .sort();

  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  await c.query(`
    CREATE TABLE IF NOT EXISTS SequelizeMeta (
      name VARCHAR(255) NOT NULL PRIMARY KEY
    )
  `);

  const [before] = await c.query('SELECT COUNT(*) AS n FROM SequelizeMeta');
  let inserted = 0;
  for (const name of files) {
    const [r] = await c.query('INSERT IGNORE INTO SequelizeMeta (name) VALUES (?)', [name]);
    if (r.affectedRows === 1) inserted += 1;
  }
  const [after] = await c.query('SELECT COUNT(*) AS n FROM SequelizeMeta');

  console.log(`Migration files on disk: ${files.length}`);
  console.log(`SequelizeMeta before: ${before[0].n}`);
  console.log(`New rows inserted: ${inserted}`);
  console.log(`SequelizeMeta after: ${after[0].n}`);

  await c.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
