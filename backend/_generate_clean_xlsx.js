/**
 * Read Concordlease.csv, clean the data, and write a clean XLSX
 * that matches the import template exactly.
 */
require('dotenv').config({ path: './config.env' });
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const CSV_PATH = path.resolve(__dirname, '../Docs/Concordlease.csv');
const OUT_PATH = path.resolve(__dirname, '../Docs/Concordlease_clean.xlsx');
const SKIPPED_PATH = path.resolve(__dirname, '../Docs/Concordlease_skipped.xlsx');

const csv = fs.readFileSync(CSV_PATH, 'utf-8');
const wb = XLSX.read(csv, { type: 'string' });
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

const getVal = (row, ...keys) => {
  for (const k of keys) {
    if (row[k] !== undefined) return row[k];
    if (row['\uFEFF' + k] !== undefined) return row['\uFEFF' + k];
  }
  return undefined;
};

const parseDate = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number' && v > 10000 && v < 100000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  }
  const str = String(v).trim();
  const iso = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const slash = str.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slash) return `${slash[1]}-${slash[2]}-${slash[3]}`;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

const cleanNum = (v) => parseFloat(String(v == null ? '0' : v).replace(/,/g, ''));

function cleanEmail(raw) {
  if (!raw) return null;
  let email = String(raw).split('/')[0].trim();
  email = email.replace(/^email:\s*/i, '').replace(/\.+$/, '').replace(/\s+\d+$/, '').trim();
  if (email.includes('@nomail.com') || email === '#N/A' || !email.includes('@')) return null;
  return email.toLowerCase();
}

const goodRows = [];
const skippedRows = [];

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const rawEmail = getVal(row, 'Tenant Email', 'tenant_email');
  const email = cleanEmail(rawEmail);
  const startDate = parseDate(getVal(row, 'Start Date', 'start_date'));
  const endDate = parseDate(getVal(row, 'End Date', 'end_date'));
  const rent = cleanNum(getVal(row, 'Monthly Rent (AED)', 'Monthly Rent') ?? 0);
  const deposit = cleanNum(getVal(row, 'Security Deposit (AED)', 'Security Deposit') ?? 0);
  const propertyName = getVal(row, 'Property Name', 'property_name') ?? '';
  const unitNumber = String(getVal(row, 'Unit Number', 'unit_number') ?? '').trim();

  const problems = [];
  if (!email) problems.push(`Invalid email: ${rawEmail || '(empty)'}`);
  if (!startDate) problems.push('Bad start date');
  if (!endDate) problems.push('Bad end date');
  if (!rent || rent <= 0) problems.push('Bad rent');
  if (!propertyName) problems.push('No property');
  if (!unitNumber) problems.push('No unit number');

  const cleaned = {
    'Tenant Email': email || '',
    'Tenant ID': '',
    'Unit ID': '',
    'Property Name': String(propertyName).trim(),
    'Unit Number': unitNumber,
    'Start Date': startDate || '',
    'End Date': endDate || '',
    'Monthly Rent (AED)': rent,
    'Security Deposit (AED)': deposit,
    'Payment Frequency': 'annually',
    'Payment Day': parseInt(getVal(row, 'Payment Day', 'payment_day') ?? 1, 10) || 1,
    'Status': 'active',
    'Lease Number': '',
    'Lease Type': String(getVal(row, 'Lease Type', 'lease_type') ?? 'residential').trim(),
    'Notes / Observations': String(getVal(row, 'Notes / Observations', 'Notes') ?? '').trim(),
    'Renewal Terms': String(getVal(row, 'Renewal Terms', 'renewal_terms') ?? '').trim(),
    'Grace Period Days': parseInt(getVal(row, 'Grace Period Days') ?? 0, 10) || 0,
    'Late Fee (AED)': parseFloat(getVal(row, 'Late Fee (AED)') ?? 0) || 0,
    'Termination Notice (Days)': parseInt(getVal(row, 'Termination Notice (Days)') ?? 60, 10) || 60,
  };

  if (problems.length === 0) {
    goodRows.push(cleaned);
  } else {
    skippedRows.push({
      'CSV Row': i + 2,
      'Problems': problems.join('; '),
      ...cleaned,
      'Original Email': String(rawEmail || ''),
    });
  }
}

// Write clean XLSX
const goodWs = XLSX.utils.json_to_sheet(goodRows);
const goodWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(goodWb, goodWs, 'Leases');
XLSX.writeFile(goodWb, OUT_PATH);
console.log(`Clean XLSX: ${goodRows.length} rows → ${OUT_PATH}`);

// Write skipped XLSX
if (skippedRows.length > 0) {
  const skipWs = XLSX.utils.json_to_sheet(skippedRows);
  const skipWb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(skipWb, skipWs, 'Skipped');
  XLSX.writeFile(skipWb, SKIPPED_PATH);
  console.log(`Skipped XLSX: ${skippedRows.length} rows → ${SKIPPED_PATH}`);
} else {
  console.log('No skipped rows!');
}
