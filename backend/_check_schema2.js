require('dotenv').config({ path: './config.env' });
const { sequelize } = require('./src/models');

(async () => {
  try {
    const [cols] = await sequelize.query("SHOW COLUMNS FROM leases WHERE Field IN ('status','payment_frequency')");
    cols.forEach(c => console.log(c.Field, ':', c.Type));

    // Check what CSV row 4 (index 2) maps to
    const XLSX = require('xlsx');
    const fs = require('fs');
    const csv = fs.readFileSync('../Docs/Concordlease.csv', 'utf-8');
    const wb = XLSX.read(csv, { type: 'string' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    const getVal = (row, ...keys) => {
      for (const k of keys) {
        if (row[k] !== undefined) return row[k];
        const b = '\uFEFF' + k;
        if (row[b] !== undefined) return row[b];
      }
      return undefined;
    };

    // Row 4 = index 2 (rowNum = index+2)
    const r = rows[2];
    console.log('\nRow 4 data:');
    console.log('Status raw:', getVal(r, 'Status'));
    console.log('PaymentFreq raw:', getVal(r, 'Payment Frequency'));
    console.log('Email:', getVal(r, 'Tenant Email'));
    console.log('Property:', getVal(r, 'Property Name'));
    console.log('Unit:', getVal(r, 'Unit Number'));
  } catch (e) {
    console.error(e.message);
  } finally {
    await sequelize.close();
  }
})();
