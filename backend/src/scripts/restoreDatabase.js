#!/usr/bin/env node
/**
 * Restore a MySQL dump into the database configured in config.env.
 * Usage: node src/scripts/restoreDatabase.js [path-to-dump.sql]
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });
const mysql = require('mysql2/promise');

function fixConstraintNames(sql) {
  return sql.replace(/CREATE TABLE `([^`]+)` \([\s\S]*?\) ENGINE=/g, (block) => {
    const table = block.match(/CREATE TABLE `([^`]+)`/)[1];
    return block.replace(/CONSTRAINT `(\d+)`/g, (_, n) => `CONSTRAINT \`${table}_fk_${n}\``);
  });
}

async function main() {
  const defaultDump = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Downloads', 'holdingdb_fixed.sql');
  const dumpPath = path.resolve(process.argv[2] || defaultDump);
  const dbName = process.env.DB_NAME || 'realestate';

  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Dump file not found: ${dumpPath}`);
  }

  let sql = fs.readFileSync(dumpPath, 'utf8');
  sql = fixConstraintNames(sql);

  console.log(`Dump: ${dumpPath} (${(sql.length / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Target: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306}/${dbName}`);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  console.log('Dropping and recreating database...');
  await conn.query('DROP DATABASE IF EXISTS ??', [dbName]);
  await conn.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [dbName]);
  await conn.query('USE ??', [dbName]);

  console.log('Importing SQL (this may take a minute)...');
  const start = Date.now();
  await conn.query(sql);
  console.log(`Import completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);

  const [tables] = await conn.query('SHOW TABLES');
  const [companies] = await conn.query(
    'SELECT id, company_name FROM company_settings ORDER BY id LIMIT 10'
  );
  console.log(`Tables restored: ${tables.length}`);
  if (companies.length) {
    console.log('Companies:', companies.map((c) => `${c.id}=${c.company_name}`).join(', '));
  }

  await conn.end();
}

main().catch((err) => {
  console.error('Restore failed:', err.message);
  process.exit(1);
});
