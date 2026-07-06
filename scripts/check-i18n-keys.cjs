#!/usr/bin/env node
'use strict';

/**
 * Compare en vs ar locale key parity per namespace folder.
 * Run: node scripts/check-i18n-keys.js
 */
const fs = require('fs');
const path = require('path');

const LOCALES_ROOT = path.join(__dirname, '../src/i18n/locales');
const EN_DIR = path.join(LOCALES_ROOT, 'en');
const AR_DIR = path.join(LOCALES_ROOT, 'ar');

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...flattenKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  const enFiles = fs.readdirSync(EN_DIR).filter((f) => f.endsWith('.json')).sort();
  const arFiles = fs.readdirSync(AR_DIR).filter((f) => f.endsWith('.json')).sort();

  if (enFiles.join(',') !== arFiles.join(',')) {
    console.error('Namespace file lists differ between en/ and ar/');
    console.error('en:', enFiles);
    console.error('ar:', arFiles);
    process.exit(1);
  }

  let hasError = false;

  for (const file of enFiles) {
    const enKeys = new Set(flattenKeys(loadJson(path.join(EN_DIR, file))));
    const arKeys = new Set(flattenKeys(loadJson(path.join(AR_DIR, file))));
    const ns = file.replace('.json', '');

    const missingInAr = [...enKeys].filter((k) => !arKeys.has(k));
    const missingInEn = [...arKeys].filter((k) => !enKeys.has(k));

    if (missingInAr.length || missingInEn.length) {
      hasError = true;
      console.error(`\n[${ns}] key mismatch:`);
      if (missingInAr.length) {
        console.error(`  Missing in ar (${missingInAr.length}):`, missingInAr.slice(0, 20));
      }
      if (missingInEn.length) {
        console.error(`  Missing in en (${missingInEn.length}):`, missingInEn.slice(0, 20));
      }
    } else {
      console.log(`[${ns}] OK (${enKeys.size} keys)`);
    }
  }

  if (hasError) {
    console.error('\ni18n key parity check FAILED');
    process.exit(1);
  }

  console.log('\ni18n key parity check PASSED');
}

main();
