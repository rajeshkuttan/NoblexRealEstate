/**
 * UAT demo data for Phase E — dev/UAT only. Creates Company A & B with scoped master data.
 * Usage: node scripts/generate-phase2e-demo-data.js [--reset]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../config.env') });

const { sequelize } = require('../src/config/database');
const {
  CompanySetting,
  Property,
  Unit,
  Tenant,
  Lease,
  BankAccount,
  ChartOfAccount,
  Invoice,
  Payment,
  JournalVoucher,
  Cheque,
  Budget,
} = require('../src/models');

async function ensureCompany(name) {
  let row = await CompanySetting.findOne({ where: { companyName: name } });
  if (!row) {
    row = await CompanySetting.create({
      companyName: name,
      currency: 'AED',
      timezone: 'Asia/Dubai',
      isActive: true,
      country: 'UAE',
    });
  }
  return row;
}

async function seedCompany(company, suffix) {
  const property = await Property.create({
    companyId: company.id,
    title: `${suffix} Tower`,
    address: 'Dubai',
    city: 'Dubai',
    emirate: 'Dubai',
    type: 'residential',
    status: 'active',
  });

  const unit = await Unit.create({
    companyId: company.id,
    propertyId: property.id,
    unitNumber: `${suffix}-101`,
    status: 'occupied',
    rentAmount: 50000,
  });

  const tenant = await Tenant.create({
    companyId: company.id,
    firstName: `Tenant`,
    lastName: suffix,
    email: `tenant.${suffix.toLowerCase()}@uat.demo`,
    phone: '+971500000001',
    status: 'active',
  });

  const lease = await Lease.create({
    companyId: company.id,
    propertyId: property.id,
    unitId: unit.id,
    tenantId: tenant.id,
    leaseNumber: `L-UAT-${suffix}-001`,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    rentAmount: 50000,
    status: 'active',
  });

  await BankAccount.create({
    companyId: company.id,
    accountName: `${suffix} Operating`,
    accountNumber: `ACC-${suffix}-001`,
    bankName: 'Demo Bank',
    currency: 'AED',
    isActive: true,
  });

  await ChartOfAccount.create({
    companyId: company.id,
    accountCode: `1000-${suffix}`,
    accountName: `Cash ${suffix}`,
    accountType: 'asset',
    level: 1,
    isActive: true,
    openingBalance: 0,
    balance: 0,
  }).catch(() => null);

  await Invoice.create({
    companyId: company.id,
    tenantId: tenant.id,
    leaseId: lease.id,
    invoiceNumber: `INV-UAT-${suffix}-001`,
    invoiceDate: '2026-05-01',
    dueDate: '2026-05-31',
    subtotal: 10000,
    taxAmount: 500,
    totalAmount: 10500,
    status: 'draft',
  });

  await Payment.create({
    companyId: company.id,
    tenantId: tenant.id,
    paymentNumber: `PAY-UAT-${suffix}-001`,
    paymentDate: '2026-05-15',
    amount: 10500,
    status: 'paid',
    paymentMethod: 'bank_transfer',
  });

  await JournalVoucher.create({
    companyId: company.id,
    jvNumber: `JV-UAT-${suffix}-001`,
    date: '2026-05-01',
    narration: `UAT opening ${suffix}`,
    totalDebit: 100,
    totalCredit: 100,
    status: 'open',
  });

  await Cheque.create({
    companyId: company.id,
    tenantId: tenant.id,
    leaseId: lease.id,
    chequeNumber: `CHQ-UAT-${suffix}-001`,
    bankName: 'Demo Bank',
    amount: 5000,
    chequeDate: '2026-06-01',
    chequeType: 'pdc',
    status: 'received',
    createdBy: 1,
  }).catch(() => null);

  await Budget.create({
    companyId: company.id,
    name: `Budget ${suffix} 2026`,
    fiscalYear: 2026,
    totalAmount: 100000,
    status: 'active',
  }).catch(() => null);

  console.log(`Seeded ${suffix} (company id ${company.id})`);
}

async function main() {
  await sequelize.authenticate();
  const companyA = await ensureCompany('UAT Company A');
  const companyB = await ensureCompany('UAT Company B');
  await seedCompany(companyA, 'A');
  await seedCompany(companyB, 'B');
  console.log('Phase E UAT demo data complete.');
  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
