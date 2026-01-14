/**
 * COMPLETE CLEANUP: Delete ALL Tenants and Leases
 * 
 * ⚠️  EXTREME WARNING: This script deletes EVERYTHING related to tenants and leases!
 * 
 * This will delete:
 * - ALL Payments
 * - ALL Invoices  
 * - ALL Tickets
 * - ALL Leases
 * - ALL Tenants
 * 
 * Properties and Units will be preserved.
 * 
 * Usage: node scripts/delete-all-tenants-leases.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const { Tenant, Lease, Invoice, Payment, Ticket } = require('../src/models');
const { sequelize } = require('../src/config/database');

// Get PaymentGatewayTransaction model if it exists
let PaymentGatewayTransaction;
try {
  PaymentGatewayTransaction = require('../src/models').PaymentGatewayTransaction;
} catch (e) {
  // Model might not be exported, we'll handle with raw query
  console.log('Note: PaymentGatewayTransaction model not found in exports, will use raw query');
}

async function deleteAllTenantsAndLeases() {
  const transaction = await sequelize.transaction();

  try {
    console.log('\n⚠️  🔥🔥🔥 COMPLETE TENANT & LEASE CLEANUP 🔥🔥🔥 ⚠️\n');
    console.log('This will delete ALL tenants, leases, and related data!\n');
    console.log('Properties and Units will be preserved.\n');

    // Step 1: Get counts of all data to be deleted
    console.log('📊 Counting records to be deleted...\n');

    const tenantCount = await Tenant.count();
    const leaseCount = await Lease.count();
    const invoiceCount = await Invoice.count();
    const paymentCount = await Payment.count();
    const ticketCount = await Ticket.count();
    
    // Count payment gateway transactions
    let gatewayTransactionCount = 0;
    try {
      const [results] = await sequelize.query('SELECT COUNT(*) as count FROM payment_gateway_transactions');
      gatewayTransactionCount = results[0]?.count || 0;
    } catch (e) {
      // Table might not exist
      console.log('   Note: payment_gateway_transactions table not found or empty');
    }

    console.log('📋 Data to be deleted:');
    console.log(`   Tenants: ${tenantCount}`);
    console.log(`   Leases: ${leaseCount}`);
    console.log(`   Invoices: ${invoiceCount}`);
    console.log(`   Payments: ${paymentCount}`);
    console.log(`   Tickets: ${ticketCount}`);
    console.log(`   Gateway Transactions: ${gatewayTransactionCount}`);
    console.log(`   TOTAL RECORDS: ${tenantCount + leaseCount + invoiceCount + paymentCount + ticketCount + gatewayTransactionCount}\n`);

    if (tenantCount === 0 && leaseCount === 0) {
      console.log('✅ Database is already clean! No tenants or leases found.\n');
      await transaction.rollback();
      process.exit(0);
    }

    console.log('🗑️  Starting deletion process...\n');

    // Step 2: Delete in correct order (respecting foreign key constraints)

    // Delete payment gateway transactions FIRST (they reference tenants)
    if (gatewayTransactionCount > 0) {
      try {
        await sequelize.query('DELETE FROM payment_gateway_transactions', { transaction });
        console.log(`   ✓ Deleted ${gatewayTransactionCount} payment gateway transaction(s)`);
      } catch (e) {
        console.log(`   ⚠️  Could not delete gateway transactions: ${e.message}`);
      }
    }

    // Delete payments (they reference invoices)
    if (paymentCount > 0) {
      const deletedPayments = await Payment.destroy({
        where: {},
        truncate: false,
        transaction
      });
      console.log(`   ✓ Deleted ${deletedPayments} payment(s)`);
    }

    // Delete invoices (they reference tenants/leases)
    if (invoiceCount > 0) {
      const deletedInvoices = await Invoice.destroy({
        where: {},
        truncate: false,
        transaction
      });
      console.log(`   ✓ Deleted ${deletedInvoices} invoice(s)`);
    }

    // Delete tickets (they reference tenants)
    if (ticketCount > 0) {
      const deletedTickets = await Ticket.destroy({
        where: {},
        truncate: false,
        transaction
      });
      console.log(`   ✓ Deleted ${deletedTickets} ticket(s)`);
    }

    // Delete leases (they reference tenants and units)
    if (leaseCount > 0) {
      const deletedLeases = await Lease.destroy({
        where: {},
        truncate: false,
        transaction
      });
      console.log(`   ✓ Deleted ${deletedLeases} lease(s)`);
    }

    // Finally, delete ALL tenants
    if (tenantCount > 0) {
      const deletedTenants = await Tenant.destroy({
        where: {},
        truncate: false,
        transaction
      });
      console.log(`   ✓ Deleted ${deletedTenants} tenant(s)`);
    }

    // Commit transaction
    await transaction.commit();

    console.log('\n✅ Transaction committed successfully!\n');

    // Step 3: Verify deletion
    console.log('🔍 Verifying deletion...\n');

    const remainingTenants = await Tenant.count();
    const remainingLeases = await Lease.count();
    const remainingInvoices = await Invoice.count();
    const remainingPayments = await Payment.count();
    const remainingTickets = await Ticket.count();
    
    let remainingGatewayTransactions = 0;
    try {
      const [results] = await sequelize.query('SELECT COUNT(*) as count FROM payment_gateway_transactions');
      remainingGatewayTransactions = results[0]?.count || 0;
    } catch (e) {
      // Table might not exist
    }

    console.log('📊 Remaining records:');
    console.log(`   Tenants: ${remainingTenants}`);
    console.log(`   Leases: ${remainingLeases}`);
    console.log(`   Invoices: ${remainingInvoices}`);
    console.log(`   Payments: ${remainingPayments}`);
    console.log(`   Tickets: ${remainingTickets}`);
    console.log(`   Gateway Transactions: ${remainingGatewayTransactions}\n`);

    // Step 4: Final Summary
    console.log('📊 Deletion Summary:');
    console.log(`   ✓ Tenants deleted: ${tenantCount}`);
    console.log(`   ✓ Leases deleted: ${leaseCount}`);
    console.log(`   ✓ Invoices deleted: ${invoiceCount}`);
    console.log(`   ✓ Payments deleted: ${paymentCount}`);
    console.log(`   ✓ Tickets deleted: ${ticketCount}`);
    console.log(`   ✓ Gateway Transactions deleted: ${gatewayTransactionCount}`);
    console.log(`   ✓ TOTAL DELETED: ${tenantCount + leaseCount + invoiceCount + paymentCount + ticketCount + gatewayTransactionCount} records\n`);

    if (remainingTenants === 0 && remainingLeases === 0) {
      console.log('✅ SUCCESS: All tenants and leases have been completely removed!\n');
      console.log('📌 Note: Properties and Units have been preserved.\n');
    } else {
      console.log('⚠️  WARNING: Some records may still remain!\n');
    }

    process.exit(0);

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error during cleanup:', error);
    console.log('\n🔄 Transaction rolled back. No data was deleted.\n');
    console.log('Error details:', error.message);
    process.exit(1);
  }
}

// Confirmation with countdown
console.log('\n⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️\n');
console.log('You are about to DELETE ALL TENANTS, LEASES, and RELATED DATA!');
console.log('This action CANNOT be undone!\n');
console.log('This will remove:');
console.log('  - Every tenant record');
console.log('  - Every lease agreement');
console.log('  - Every invoice');
console.log('  - Every payment');
console.log('  - Every ticket\n');
console.log('Properties and Units will NOT be deleted.\n');
console.log('Press Ctrl+C to cancel, or wait 10 seconds to continue...\n');

let countdown = 10;
const countdownInterval = setInterval(() => {
  process.stdout.write(`\r⏳ Starting in ${countdown} seconds... `);
  countdown--;
  
  if (countdown < 0) {
    clearInterval(countdownInterval);
    console.log('\n\n🚀 Starting cleanup...\n');
    deleteAllTenantsAndLeases();
  }
}, 1000);
