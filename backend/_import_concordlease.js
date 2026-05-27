/**
 * Direct CSV → Lease import. Creates lease rows and marks units occupied.
 * Does NOT generate invoices/payments/cheques (do that separately if needed).
 * Saves failed-rows report to _import_failures.json.
 */
require('dotenv').config({ path: './config.env' });
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const CSV_PATH = path.resolve(__dirname, '../Docs/Concordlease.csv');

(async () => {
  const { Lease, Tenant, Unit, Property, sequelize } = require('./src/models');
  const documentNumberingService = require('./src/services/documentNumberingService');
  const { Op } = require('sequelize');

  console.log('Reading CSV:', CSV_PATH);
  const csv = fs.readFileSync(CSV_PATH, 'utf-8');
  const wb = XLSX.read(csv, { type: 'string' });
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log(`Parsed ${rows.length} rows\n`);

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

  const normFreq = (v) => {
    const s = String(v || 'monthly').toLowerCase().replace(/\s+/g, '');
    if (s === 'quarterly') return 'quarterly';
    if (s === 'semi-annually' || s === 'semiannually') return 'semi-annually';
    if (s === 'annually' || s === 'annual' || s === 'yearly') return 'annually';
    return 'monthly';
  };

  const cleanNum = (v) => parseFloat(String(v == null ? '0' : v).replace(/,/g, ''));

  // Cache tenant emails → id and property+unit → unitId
  const tenantCache = new Map();
  const unitCache = new Map();

  const results = { success: 0, failed: 0, errors: [] };
  let leaseCounter = await Lease.count();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const errs = [];

    // --- Parse fields ---
    const tenantIdRaw = getVal(row, 'Tenant ID', 'tenant_id');
    const tenantEmailRaw = getVal(row, 'Tenant Email', 'tenant_email');
    const unitIdRaw = getVal(row, 'Unit ID', 'unit_id');
    const propertyName = getVal(row, 'Property Name', 'property_name');
    const unitNumber = getVal(row, 'Unit Number', 'unit_number');
    const startDate = parseDate(getVal(row, 'Start Date', 'start_date'));
    const endDate = parseDate(getVal(row, 'End Date', 'end_date'));
    const monthlyRent = cleanNum(getVal(row, 'Monthly Rent (AED)', 'Monthly Rent', 'monthly_rent') ?? 0);
    const deposit = cleanNum(getVal(row, 'Security Deposit (AED)', 'Security Deposit', 'deposit') ?? 0);
    const statusRaw = String(getVal(row, 'Status', 'status') ?? 'draft').toLowerCase();
    const mapped = statusRaw === 'approved' ? 'active' : statusRaw;
    const status = ['active', 'draft', 'expired', 'terminated', 'renewed'].includes(mapped) ? mapped : 'draft';
    const paymentFrequency = normFreq(getVal(row, 'Payment Frequency', 'payment_frequency'));
    const notes = getVal(row, 'Notes / Observations', 'Notes', 'notes') ?? '';

    if (!startDate) errs.push('Start Date is required');
    if (!endDate) errs.push('End Date is required');
    if (!monthlyRent || monthlyRent <= 0) errs.push('Monthly Rent must be > 0');

    // --- Tenant lookup (by email) ---
    let tenantId = tenantIdRaw != null && !isNaN(parseInt(tenantIdRaw, 10)) ? parseInt(tenantIdRaw, 10) : null;

    if (!tenantId) {
      let email = tenantEmailRaw ? String(tenantEmailRaw).split('/')[0].trim() : null;
      if (email) email = email.replace(/^email:\s*/i, '').replace(/\.+$/, '').replace(/\s+\d+$/, '').trim();
      if (email && (email.includes('@nomail.com') || email === '#N/A' || !email.includes('@'))) email = null;

      if (email) {
        const cacheKey = email.toLowerCase();
        if (tenantCache.has(cacheKey)) {
          tenantId = tenantCache.get(cacheKey);
        } else {
          const t = await Tenant.findOne({
            where: sequelize.where(sequelize.fn('LOWER', sequelize.col('email')), cacheKey),
          });
          if (t) {
            tenantId = t.id;
            tenantCache.set(cacheKey, t.id);
          } else {
            errs.push(`Tenant not found for email: ${email}`);
          }
        }
      } else {
        errs.push(`No valid email: raw="${tenantEmailRaw || ''}"`);
      }
    }

    // --- Unit lookup ---
    let unitId = unitIdRaw != null && unitIdRaw !== '' && !isNaN(parseInt(unitIdRaw, 10)) ? parseInt(unitIdRaw, 10) : null;

    if (!unitId && propertyName && unitNumber != null) {
      const unitKey = `${String(propertyName).trim().toLowerCase()}||${String(unitNumber).trim()}`;
      if (unitCache.has(unitKey)) {
        unitId = unitCache.get(unitKey);
      } else {
        const prop = await Property.findOne({
          where: sequelize.where(sequelize.fn('LOWER', sequelize.col('title')), String(propertyName).trim().toLowerCase()),
        });
        if (prop) {
          const unit = await Unit.findOne({
            where: { propertyId: prop.id, unitNumber: String(unitNumber).trim() },
          });
          if (unit) {
            unitId = unit.id;
            unitCache.set(unitKey, unit.id);
          } else {
            errs.push(`Unit not found: ${propertyName} / ${unitNumber}`);
          }
        } else {
          errs.push(`Property not found: ${propertyName}`);
        }
      }
    } else if (!unitId) {
      errs.push('Unit ID or (Property + Unit Number) required');
    }

    if (errs.length) {
      results.failed++;
      results.errors.push({ row: rowNum, messages: errs });
      continue;
    }

    // --- Create lease ---
    try {
      leaseCounter++;
      let leaseNumber;
      try {
        leaseNumber = await documentNumberingService.generateDocumentNumber('Lease');
      } catch {
        leaseNumber = `L-${new Date().getFullYear()}-${String(leaseCounter).padStart(4, '0')}`;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      let duration = 12;
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        duration = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1);
      }

      await Lease.create({
        leaseNumber,
        leaseType: String(getVal(row, 'Lease Type', 'lease_type') ?? 'residential').toLowerCase().includes('commercial') ? 'commercial' : 'residential',
        tenantId,
        unitId,
        startDate,
        endDate,
        duration,
        rentAmount: monthlyRent,
        depositAmount: deposit,
        paymentFrequency,
        paymentDay: parseInt(getVal(row, 'Payment Day', 'payment_day') ?? 1, 10) || 1,
        status,
        terms: notes || null,
        renewalTerms: getVal(row, 'Renewal Terms', 'renewal_terms') ?? null,
        isActive: status === 'active',
        gracePeriod: parseInt(getVal(row, 'Grace Period Days') ?? 0, 10) || 0,
        lateFee: parseFloat(getVal(row, 'Late Fee (AED)') ?? 0) || 0,
        terminationNotice: parseInt(getVal(row, 'Termination Notice (Days)') ?? 60, 10) || 60,
        totalDeposits: deposit,
      });

      if (status === 'active' && unitId) {
        await Unit.update({ status: 'occupied' }, { where: { id: unitId } });
      }

      results.success++;
      if (results.success % 100 === 0) console.log(`  ... ${results.success} imported so far`);
    } catch (e) {
      results.failed++;
      results.errors.push({ row: rowNum, messages: [e.message || String(e)] });
    }
  }

  console.log(`\nDone. Success: ${results.success}, Failed: ${results.failed}`);

  const reportPath = path.resolve(__dirname, '_import_failures.json');
  fs.writeFileSync(reportPath, JSON.stringify(results.errors, null, 2));
  console.log(`Failed rows saved to: ${reportPath}`);

  if (results.errors.length > 0) {
    console.log('\n--- Failures ---');
    results.errors.forEach((e) => {
      console.log(`  Row ${e.row}: ${e.messages.join('; ')}`);
    });
  }

  await sequelize.close();
})();
