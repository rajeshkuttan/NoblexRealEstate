const path = require('path');
const fs = require('fs');

// Load environment variables
const nodeEnv = process.env.NODE_ENV || 'development';
const dotenvPath = path.join(__dirname, '../.env');
const productionConfigPath = path.join(__dirname, '../config.production.env');
const devConfigPath = path.join(__dirname, '../config.env');

let configPath;
if (fs.existsSync(dotenvPath)) {
  configPath = dotenvPath;
} else if (nodeEnv === 'production' && fs.existsSync(productionConfigPath)) {
  configPath = productionConfigPath;
} else {
  configPath = devConfigPath;
}

require('dotenv').config({ path: configPath });
console.log(`✅ Loading configuration from: ${path.basename(configPath)} (NODE_ENV: ${nodeEnv})`);

const { Unit, Lease, Invoice, Payment, Ticket } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function deleteAllUnits() {
  console.log('\n⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️');
  console.log('\nYou are about to DELETE ALL UNITS and RELATED DATA!');
  console.log('This action CANNOT be undone!');
  console.log('\nThis will remove:');
  console.log('  - Every unit record');
  console.log('  - Every lease associated with units');
  console.log('  - Every invoice associated with those leases');
  console.log('  - Every payment associated with those leases');
  console.log('  - Every ticket associated with those leases');
  console.log('\nProperties will NOT be deleted.');

  // Countdown
  for (let i = 10; i >= 0; i--) {
    process.stdout.write(`\r⏳ Starting in ${i} seconds... `);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n🚀 Starting cleanup...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.\n');

    let unitCount, leaseCount, invoiceCount, paymentCount, ticketCount;

    // Use transaction for atomicity
    await sequelize.transaction(async (t) => {
      // Count records before deletion
      unitCount = await Unit.count({ transaction: t });
      leaseCount = await Lease.count({ transaction: t });
      invoiceCount = await Invoice.count({ transaction: t });
      paymentCount = await Payment.count({ transaction: t });
      ticketCount = await Ticket.count({ transaction: t });

      console.log('📋 Data to be deleted:');
      console.log(`   Units: ${unitCount}`);
      console.log(`   Leases: ${leaseCount}`);
      console.log(`   Invoices: ${invoiceCount}`);
      console.log(`   Payments: ${paymentCount}`);
      console.log(`   Tickets: ${ticketCount}`);
      console.log(`   TOTAL RECORDS: ${unitCount + leaseCount + invoiceCount + paymentCount + ticketCount}\n`);

      console.log('🗑️  Starting deletion process...');

      // Delete in order of foreign key dependencies
      // 1. Delete payments first (references leases)
      const deletedPayments = await Payment.destroy({ where: {}, transaction: t });
      console.log(`   ✓ Deleted ${deletedPayments} payment(s)`);

      // 2. Delete invoices (references leases)
      const deletedInvoices = await Invoice.destroy({ where: {}, transaction: t });
      console.log(`   ✓ Deleted ${deletedInvoices} invoice(s)`);

      // 3. Delete tickets (references leases)
      const deletedTickets = await Ticket.destroy({ where: {}, transaction: t });
      console.log(`   ✓ Deleted ${deletedTickets} ticket(s)`);

      // 4. Delete leases (references units)
      const deletedLeases = await Lease.destroy({ where: {}, transaction: t });
      console.log(`   ✓ Deleted ${deletedLeases} lease(s)`);

      // 5. Finally delete units
      const deletedUnits = await Unit.destroy({ where: {}, transaction: t });
      console.log(`   ✓ Deleted ${deletedUnits} unit(s)`);

      console.log('\n✅ Transaction committed successfully!');
    });

    // Verify deletion
    const remainingUnits = await Unit.count();
    const remainingLeases = await Lease.count();
    const remainingInvoices = await Invoice.count();
    const remainingPayments = await Payment.count();
    const remainingTickets = await Ticket.count();

    console.log('\n🔍 Verifying deletion...');
    console.log('\n📊 Remaining records:');
    console.log(`   Units: ${remainingUnits}`);
    console.log(`   Leases: ${remainingLeases}`);
    console.log(`   Invoices: ${remainingInvoices}`);
    console.log(`   Payments: ${remainingPayments}`);
    console.log(`   Tickets: ${remainingTickets}`);

    console.log('\n📊 Deletion Summary:');
    console.log(`   ✓ Units deleted: ${unitCount - remainingUnits}`);
    console.log(`   ✓ Leases deleted: ${leaseCount - remainingLeases}`);
    console.log(`   ✓ Invoices deleted: ${invoiceCount - remainingInvoices}`);
    console.log(`   ✓ Payments deleted: ${paymentCount - remainingPayments}`);
    console.log(`   ✓ Tickets deleted: ${ticketCount - remainingTickets}`);
    console.log(`   ✓ TOTAL DELETED: ${
      (unitCount - remainingUnits) +
      (leaseCount - remainingLeases) +
      (invoiceCount - remainingInvoices) +
      (paymentCount - remainingPayments) +
      (ticketCount - remainingTickets)
    } records`);

    console.log('\n✅ SUCCESS: All units and related data have been completely removed!');
    console.log('\n📌 Note: Properties have been preserved.\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.log('\n🔄 Transaction rolled back. No data was deleted.');
    process.exit(1);
  }
}

// Run the cleanup
deleteAllUnits();
