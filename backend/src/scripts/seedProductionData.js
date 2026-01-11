/**
 * Production-Like Data Seeder
 * Generates realistic data for performance testing
 * Target: 10,000+ records across all tables
 */

const { sequelize } = require('../config/database');
const models = require('../models');

const {
  Property,
  Unit,
  Tenant,
  Lease,
  Invoice,
  Payment,
  FinancialTransaction,
  Vendor,
  VendorInvoice,
  Ticket,
  Budget,
  BankAccount,
  BankTransaction,
  ChartOfAccount,
  User
} = models;

// Configuration
const CONFIG = {
  properties: 50,
  unitsPerProperty: 20, // Total: 1,000 units
  tenants: 800,
  leasesPerTenant: 1.2, // Total: ~960 leases
  invoicesPerLease: 12, // Total: ~11,520 invoices
  paymentsPerInvoice: 1, // Total: ~11,520 payments
  transactionsPerProperty: 50, // Total: 2,500 transactions
  vendors: 100,
  vendorInvoicesPerVendor: 15, // Total: 1,500 vendor invoices
  ticketsPerUnit: 0.5, // Total: ~500 tickets
  budgetsPerProperty: 3, // Total: 150 budgets
  bankAccounts: 10,
  bankTransactionsPerAccount: 200 // Total: 2,000 transactions
};

// Helper functions
const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomItem = (array) => array[Math.floor(Math.random() * array.length)];

const randomAmount = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomDecimal = (min, max, decimals = 2) => {
  return (Math.random() * (max - min) + min).toFixed(decimals);
};

// Emirates data
const EMIRATES = ['dubai', 'abu_dhabi', 'sharjah', 'ajman', 'ras_al_khaimah', 'fujairah', 'umm_al_quwain'];
const COMMUNITIES = ['Downtown Dubai', 'Dubai Marina', 'Palm Jumeirah', 'Business Bay', 'JBR', 'Arabian Ranches', 'Emirates Hills', 'Al Barsha', 'Jumeirah'];
const BUILDING_TYPES = ['apartment', 'villa', 'townhouse', 'penthouse', 'studio'];
const PROPERTY_TYPES = ['residential', 'commercial', 'mixed_use'];

// Seed functions
async function seedUsers() {
  console.log('Seeding users...');
  const users = [];
  
  for (let i = 1; i <= 20; i++) {
    users.push({
      email: `user${i}@emiratesleaseflow.com`,
      password: '$2b$10$abcdefghijklmnopqrstuvwxyz123456', // Hashed password
      firstName: `User${i}`,
      lastName: `Test`,
      role: randomItem(['admin', 'finance_manager', 'accountant', 'property_manager']),
      isActive: true
    });
  }
  
  await User.bulkCreate(users, { ignoreDuplicates: true });
  console.log(`✓ Created ${users.length} users`);
}

async function seedProperties() {
  console.log('Seeding properties...');
  const properties = [];
  
  for (let i = 1; i <= CONFIG.properties; i++) {
    properties.push({
      title: `${randomItem(COMMUNITIES)} Tower ${i}`,
      location: `${randomItem(EMIRATES)}, UAE`,
      emirate: randomItem(EMIRATES),
      community: randomItem(COMMUNITIES),
      buildingType: randomItem(BUILDING_TYPES),
      bedrooms: randomItem([1, 2, 3, 4, 5]),
      bathrooms: randomItem([1, 2, 3, 4]),
      area: randomDecimal(500, 3000),
      price: randomAmount(500000, 5000000),
      pricePerSqft: randomDecimal(500, 2000),
      description: `Premium ${randomItem(BUILDING_TYPES)} in ${randomItem(COMMUNITIES)}`
    });
  }
  
  await Property.bulkCreate(properties);
  console.log(`✓ Created ${properties.length} properties`);
}

async function seedUnits() {
  console.log('Seeding units...');
  const properties = await Property.findAll();
  const units = [];
  
  for (const property of properties) {
    for (let i = 1; i <= CONFIG.unitsPerProperty; i++) {
      const floor = Math.ceil(i / 4);
      units.push({
        propertyId: property.id,
        unitNumber: `${floor}0${(i % 4) + 1}`,
        floor,
        bedrooms: randomItem([1, 2, 3, 4]),
        bathrooms: randomItem([1, 2, 3]),
        area: randomDecimal(500, 2000),
        rent: randomAmount(30000, 150000),
        status: randomItem(['available', 'occupied', 'maintenance']),
        furnishing: randomItem(['furnished', 'unfurnished', 'semi_furnished']),
        parking: randomItem([1, 2, 3]),
        balcony: Math.random() > 0.5,
        view: randomItem(['sea', 'city', 'garden', 'pool']),
        isActive: true
      });
    }
  }
  
  await Unit.bulkCreate(units);
  console.log(`✓ Created ${units.length} units`);
}

async function seedTenants() {
  console.log('Seeding tenants...');
  const tenants = [];
  
  const firstNames = ['Ahmed', 'Mohammed', 'Fatima', 'Ali', 'Sara', 'Omar', 'Layla', 'Hassan', 'Zainab', 'Khalid', 'Aisha', 'Yusuf', 'Mariam', 'Abdullah', 'Noor'];
  const lastNames = ['Al-Maktoum', 'Al-Nahyan', 'Al-Qasimi', 'Al-Sharqi', 'Al-Mualla', 'Al-Nuaimi', 'Khan', 'Patel', 'Singh', 'Chen', 'Smith', 'Johnson', 'Williams'];
  
  for (let i = 1; i <= CONFIG.tenants; i++) {
    tenants.push({
      firstName: randomItem(firstNames),
      lastName: randomItem(lastNames),
      email: `tenant${i}@email.com`,
      phone: `+971${randomAmount(500000000, 599999999)}`,
      emiratesId: `784-${randomAmount(1000, 9999)}-${randomAmount(1000000, 9999999)}-${randomAmount(1, 9)}`,
      passportNumber: `A${randomAmount(10000000, 99999999)}`,
      nationality: randomItem(['UAE', 'India', 'Pakistan', 'Philippines', 'Egypt', 'UK', 'USA', 'China']),
      dateOfBirth: randomDate(new Date('1960-01-01'), new Date('2000-12-31')),
      occupation: randomItem(['Engineer', 'Manager', 'Doctor', 'Teacher', 'Business Owner', 'Consultant']),
      isActive: true
    });
  }
  
  await Tenant.bulkCreate(tenants);
  console.log(`✓ Created ${tenants.length} tenants`);
}

async function seedLeases() {
  console.log('Seeding leases...');
  const units = await Unit.findAll({ where: { status: 'occupied' } });
  const tenants = await Tenant.findAll();
  const leases = [];
  
  const totalLeases = Math.min(Math.floor(CONFIG.tenants * CONFIG.leasesPerTenant), units.length);
  
  for (let i = 0; i < totalLeases; i++) {
    const startDate = randomDate(new Date('2023-01-01'), new Date('2025-12-31'));
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);
    
    const rentAmount = randomAmount(30000, 150000);
    
    leases.push({
      leaseNumber: `L-2024-${String(i + 1).padStart(4, '0')}`,
      tenantId: tenants[i % tenants.length].id,
      unitId: units[i % units.length].id,
      startDate,
      endDate,
      rentAmount,
      depositAmount: rentAmount,
      paymentDay: 1,
      terms: '12 months lease with annual renewal option',
      status: randomItem(['active', 'active', 'active', 'expired', 'draft']),
      paymentFrequency: randomItem(['monthly', 'quarterly', 'semi-annually', 'annually']),
      isActive: true
    });
  }
  
  await Lease.bulkCreate(leases);
  console.log(`✓ Created ${leases.length} leases`);
}

async function seedInvoices() {
  console.log('Seeding invoices...');
  const leases = await Lease.findAll({ where: { status: 'active' } });
  const invoices = [];
  
  for (const lease of leases) {
    for (let i = 0; i < CONFIG.invoicesPerLease; i++) {
      const invoiceDate = new Date(lease.startDate);
      invoiceDate.setMonth(invoiceDate.getMonth() + i);
      
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 5);
      
      const subtotal = parseFloat(lease.rentAmount || 0);
      const taxRate = 5;
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;
      
      invoices.push({
        invoiceNumber: `INV-2024-${String(invoices.length + 1).padStart(6, '0')}`,
        leaseId: lease.id,
        tenantId: lease.tenantId,
        invoiceDate,
        dueDate,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        status: randomItem(['paid', 'paid', 'paid', 'pending', 'overdue']),
        description: `Rent for ${invoiceDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        isActive: true
      });
      
      if (invoices.length >= 1000) break; // Batch insert
    }
    
    if (invoices.length >= 1000) {
      await Invoice.bulkCreate(invoices);
      console.log(`  ↳ Batch inserted ${invoices.length} invoices`);
      invoices.length = 0;
    }
  }
  
  if (invoices.length > 0) {
    await Invoice.bulkCreate(invoices);
  }
  
  const totalInvoices = await Invoice.count();
  console.log(`✓ Created ${totalInvoices} invoices`);
}

async function seedPayments() {
  console.log('Seeding payments...');
  const invoices = await Invoice.findAll({ where: { status: 'paid' } });
  const payments = [];
  
  for (const invoice of invoices) {
    const paymentDate = new Date(invoice.dueDate);
    paymentDate.setDate(paymentDate.getDate() + randomAmount(-5, 10));
    
    payments.push({
      paymentNumber: `PAY-2024-${String(payments.length + 1).padStart(6, '0')}`,
      leaseId: invoice.leaseId,
      amount: invoice.totalAmount,
      paymentDate,
      paymentMethod: randomItem(['bank_transfer', 'cheque', 'cash', 'credit_card']),
      referenceNumber: `REF${randomAmount(100000, 999999)}`,
      status: 'completed',
      notes: 'Payment received',
      isActive: true
    });
    
    if (payments.length >= 1000) {
      await Payment.bulkCreate(payments);
      console.log(`  ↳ Batch inserted ${payments.length} payments`);
      payments.length = 0;
    }
  }
  
  if (payments.length > 0) {
    await Payment.bulkCreate(payments);
  }
  
  const totalPayments = await Payment.count();
  console.log(`✓ Created ${totalPayments} payments`);
}

async function seedFinancialTransactions() {
  console.log('Seeding financial transactions...');
  const properties = await Property.findAll();
  const transactions = [];
  
  for (const property of properties) {
    for (let i = 0; i < CONFIG.transactionsPerProperty; i++) {
      const transactionDate = randomDate(new Date('2024-01-01'), new Date('2025-12-31'));
      const isCredit = Math.random() > 0.3; // 70% credits (income), 30% debits (expenses)
      
      transactions.push({
        transactionDate,
        transactionType: isCredit ? 'credit' : 'debit',
        amount: randomAmount(1000, 50000),
        description: isCredit ? 
          randomItem(['Rental Income', 'Service Charge', 'Parking Fee', 'Late Payment Fee']) :
          randomItem(['Maintenance', 'Utilities', 'Insurance', 'Property Tax', 'Repairs']),
        category: isCredit ? 'Revenue' : 'Expense',
        propertyId: property.id,
        status: 'completed'
      });
    }
  }
  
  await FinancialTransaction.bulkCreate(transactions);
  console.log(`✓ Created ${transactions.length} financial transactions`);
}

async function seedVendors() {
  console.log('Seeding vendors...');
  const vendors = [];
  
  const vendorNames = ['ABC Maintenance', 'XYZ Plumbing', 'Elite Cleaning', 'Premium HVAC', 'Quick Fix', 'Pro Services', 'City Electrical', 'Gulf Supplies'];
  
  for (let i = 0; i < CONFIG.vendors; i++) {
    vendors.push({
      vendorName: `${randomItem(vendorNames)} ${i + 1}`,
      email: `vendor${i + 1}@company.com`,
      phone: `+971${randomAmount(400000000, 499999999)}`,
      address: `${randomItem(EMIRATES)}, UAE`,
      trn: `100000000000003${i}`,
      paymentTerms: randomItem([7, 15, 30, 45, 60]),
      isActive: true
    });
  }
  
  await Vendor.bulkCreate(vendors);
  console.log(`✓ Created ${vendors.length} vendors`);
}

async function seedVendorInvoices() {
  console.log('Seeding vendor invoices...');
  const vendors = await Vendor.findAll();
  const properties = await Property.findAll();
  const invoices = [];
  
  for (const vendor of vendors) {
    for (let i = 0; i < CONFIG.vendorInvoicesPerVendor; i++) {
      const invoiceDate = randomDate(new Date('2024-01-01'), new Date('2025-12-31'));
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + vendor.paymentTerms);
      
      const subtotal = randomAmount(5000, 50000);
      const taxRate = 5;
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount;
      
      invoices.push({
        invoiceNumber: `VI-2024-${String(invoices.length + 1).padStart(6, '0')}`,
        vendorId: vendor.id,
        invoiceDate,
        dueDate,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        status: randomItem(['pending', 'approved', 'paid', 'paid']),
        description: randomItem(['Maintenance services', 'Repair work', 'Cleaning services', 'HVAC maintenance']),
        propertyId: randomItem(properties).id,
        isActive: true
      });
    }
  }
  
  await VendorInvoice.bulkCreate(invoices);
  console.log(`✓ Created ${invoices.length} vendor invoices`);
}

async function seedTickets() {
  console.log('Seeding tickets...');
  const units = await Unit.findAll();
  const tenants = await Tenant.findAll();
  const users = await User.findAll();
  const tickets = [];
  
  const totalTickets = Math.floor(units.length * CONFIG.ticketsPerUnit);
  
  for (let i = 0; i < totalTickets; i++) {
    const createdAt = randomDate(new Date('2024-01-01'), new Date('2025-12-31'));
    
    tickets.push({
      ticketNumber: `TKT-2024-${String(i + 1).padStart(5, '0')}`,
      title: randomItem(['AC not working', 'Plumbing issue', 'Electrical problem', 'Door lock broken', 'Water leakage', 'Paint work needed']),
      description: 'Detailed description of the maintenance issue',
      tenantId: randomItem(tenants).id,
      unitId: randomItem(units).id,
      status: randomItem(['open', 'in_progress', 'completed', 'completed', 'closed']),
      priority: randomItem(['low', 'medium', 'high']),
      category: randomItem(['plumbing', 'electrical', 'hvac', 'general']),
      assignedTo: randomItem(users).id,
      estimatedCost: randomAmount(500, 5000),
      actualCost: randomAmount(500, 5000),
      isActive: true,
      createdAt,
      updatedAt: createdAt
    });
  }
  
  await Ticket.bulkCreate(tickets);
  console.log(`✓ Created ${tickets.length} tickets`);
}

async function seedBudgets() {
  console.log('Seeding budgets...');
  const properties = await Property.findAll();
  const budgets = [];
  
  for (const property of properties) {
    for (let year = 2024; year <= 2026; year++) {
      const periodStart = new Date(`${year}-01-01`);
      const periodEnd = new Date(`${year}-12-31`);
      
      budgets.push({
        budgetName: `${property.title} - ${year} Budget`,
        propertyId: property.id,
        periodStart,
        periodEnd,
        budgetedRevenue: randomAmount(500000, 2000000),
        budgetedExpenses: randomAmount(200000, 800000),
        status: year < 2026 ? 'approved' : 'draft',
        notes: `Annual budget for ${year}`,
        isActive: true
      });
    }
  }
  
  await Budget.bulkCreate(budgets);
  console.log(`✓ Created ${budgets.length} budgets`);
}

async function seedBankAccounts() {
  console.log('Seeding bank accounts...');
  const accounts = [];
  
  const banks = ['Emirates NBD', 'ADCB', 'Mashreq Bank', 'Dubai Islamic Bank', 'RAKBANK'];
  
  for (let i = 0; i < CONFIG.bankAccounts; i++) {
    accounts.push({
      bankName: randomItem(banks),
      accountName: `Business Account ${i + 1}`,
      accountNumber: `AE${randomAmount(100000000000000, 999999999999999)}`,
      iban: `AE${randomAmount(100000000000000000, 999999999999999999)}`,
      swiftCode: `EBILAEAD${String.fromCharCode(65 + i)}`,
      currency: randomItem(['AED', 'USD', 'EUR']),
      balance: randomAmount(100000, 5000000),
      isActive: true
    });
  }
  
  await BankAccount.bulkCreate(accounts);
  console.log(`✓ Created ${accounts.length} bank accounts`);
}

async function seedBankTransactions() {
  console.log('Seeding bank transactions...');
  const accounts = await BankAccount.findAll();
  const transactions = [];
  
  for (const account of accounts) {
    for (let i = 0; i < CONFIG.bankTransactionsPerAccount; i++) {
      const transactionDate = randomDate(new Date('2024-01-01'), new Date('2025-12-31'));
      const isCredit = Math.random() > 0.5;
      
      transactions.push({
        bankAccountId: account.id,
        transactionDate,
        transactionType: isCredit ? 'credit' : 'debit',
        amount: randomAmount(1000, 100000),
        description: isCredit ? 
          randomItem(['Customer payment', 'Rent receipt', 'Deposit', 'Interest']) :
          randomItem(['Vendor payment', 'Salary', 'Utilities', 'Transfer']),
        referenceNumber: `${randomItem(['CHQ', 'TRF', 'DD'])}${randomAmount(100000, 999999)}`,
        balance: account.balance + randomAmount(-50000, 50000)
      });
    }
  }
  
  await BankTransaction.bulkCreate(transactions);
  console.log(`✓ Created ${transactions.length} bank transactions`);
}

// Main seed function
async function seedAll() {
  try {
    console.log('\n🌱 Starting production data seeding...\n');
    console.log(`Target Configuration:`);
    console.log(`  - Properties: ${CONFIG.properties}`);
    console.log(`  - Units: ${CONFIG.properties * CONFIG.unitsPerProperty}`);
    console.log(`  - Tenants: ${CONFIG.tenants}`);
    console.log(`  - Estimated Leases: ${Math.floor(CONFIG.tenants * CONFIG.leasesPerTenant)}`);
    console.log(`  - Estimated Invoices: ${Math.floor(CONFIG.tenants * CONFIG.leasesPerTenant * CONFIG.invoicesPerLease)}`);
    console.log(`  - Vendors: ${CONFIG.vendors}`);
    console.log(`  - Total Records: 15,000+\n`);
    
    const startTime = Date.now();
    
    // Seed in order (respecting foreign key constraints)
    await seedUsers();
    await seedProperties();
    await seedUnits();
    await seedTenants();
    await seedLeases();
    await seedInvoices();
    await seedPayments();
    await seedFinancialTransactions();
    await seedVendors();
    await seedVendorInvoices();
    await seedTickets();
    await seedBudgets();
    await seedBankAccounts();
    await seedBankTransactions();
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    // Final count
    const counts = {
      users: await User.count(),
      properties: await Property.count(),
      units: await Unit.count(),
      tenants: await Tenant.count(),
      leases: await Lease.count(),
      invoices: await Invoice.count(),
      payments: await Payment.count(),
      financialTransactions: await FinancialTransaction.count(),
      vendors: await Vendor.count(),
      vendorInvoices: await VendorInvoice.count(),
      tickets: await Ticket.count(),
      budgets: await Budget.count(),
      bankAccounts: await BankAccount.count(),
      bankTransactions: await BankTransaction.count()
    };
    
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    
    console.log('\n✅ Seeding completed successfully!\n');
    console.log('📊 Final Record Counts:');
    Object.entries(counts).forEach(([key, value]) => {
      console.log(`  - ${key.padEnd(25)}: ${value.toLocaleString()}`);
    });
    console.log(`  ${'='.repeat(35)}`);
    console.log(`  ${'TOTAL RECORDS'.padEnd(25)}: ${total.toLocaleString()}`);
    console.log(`\n⏱️  Time taken: ${duration} seconds\n`);
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  seedAll().catch(console.error);
}

module.exports = { seedAll, CONFIG };
