/**
 * FORCE Cleanup Script: Delete ALL Tenants Without Names
 * 
 * ⚠️  WARNING: This script FORCEFULLY deletes ALL tenants without names,
 * even if they have associated leases. Use with extreme caution!
 * 
 * This will also delete associated:
 * - Leases
 * - Invoices
 * - Payments
 * - Tickets
 * 
 * Usage: node scripts/force-cleanup-tenants.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const { Tenant, Lease, Invoice, Payment, Ticket } = require('../src/models');
const { Op } = require('sequelize');
const { sequelize } = require('../src/config/database');

async function forceCleanupTenants() {
  const transaction = await sequelize.transaction();

  try {
    console.log('⚠️  🔥 FORCE CLEANUP MODE 🔥 ⚠️\n');
    console.log('This will delete ALL tenants without names, including their associated data!\n');

    // Step 1: Find tenants without valid names
    const tenantsToDelete = await Tenant.findAll({
      where: {
        [Op.or]: [
          { name: null },
          { name: '' },
          { name: { [Op.regexp]: '^[\\s]*$' } }
        ]
      },
      include: [
        {
          model: Lease,
          as: 'leases',
          required: false
        }
      ]
    });

    console.log(`📊 Found ${tenantsToDelete.length} tenant(s) without valid names\n`);

    if (tenantsToDelete.length === 0) {
      console.log('✅ No tenants to delete. Database is clean!\n');
      await transaction.rollback();
      process.exit(0);
    }

    // Step 2: Display all tenants to be deleted
    console.log('📋 Tenants to be FORCE DELETED:\n');
    tenantsToDelete.forEach((tenant, index) => {
      console.log(`${index + 1}. ID: ${tenant.id}`);
      console.log(`   Email: ${tenant.email || 'N/A'}`);
      console.log(`   Phone: ${tenant.phone || 'N/A'}`);
      console.log(`   Name: "${tenant.name}"`);
      console.log(`   Leases: ${tenant.leases?.length || 0}`);
      console.log(`   Created: ${tenant.created_at}\n`);
    });

    const tenantIds = tenantsToDelete.map(t => t.id);

    // Step 3: Get counts of related data
    const leaseCount = await Lease.count({
      where: { tenantId: { [Op.in]: tenantIds } }
    });

    const invoiceCount = await Invoice.count({
      where: { tenantId: { [Op.in]: tenantIds } }
    });

    const paymentCount = await Payment.count({
      where: { tenantId: { [Op.in]: tenantIds } }
    });

    const ticketCount = await Ticket.count({
      where: { tenantId: { [Op.in]: tenantIds } }
    });

    console.log('📊 Related data to be deleted:');
    console.log(`   Leases: ${leaseCount}`);
    console.log(`   Invoices: ${invoiceCount}`);
    console.log(`   Payments: ${paymentCount}`);
    console.log(`   Tickets: ${ticketCount}\n`);

    // Step 4: Delete in correct order (foreign key constraints)
    console.log('🗑️  Starting deletion process...\n');

    // Delete payments first
    if (paymentCount > 0) {
      const deletedPayments = await Payment.destroy({
        where: { tenantId: { [Op.in]: tenantIds } },
        transaction
      });
      console.log(`   ✓ Deleted ${deletedPayments} payment(s)`);
    }

    // Delete invoices
    if (invoiceCount > 0) {
      const deletedInvoices = await Invoice.destroy({
        where: { tenantId: { [Op.in]: tenantIds } },
        transaction
      });
      console.log(`   ✓ Deleted ${deletedInvoices} invoice(s)`);
    }

    // Delete tickets
    if (ticketCount > 0) {
      const deletedTickets = await Ticket.destroy({
        where: { tenantId: { [Op.in]: tenantIds } },
        transaction
      });
      console.log(`   ✓ Deleted ${deletedTickets} ticket(s)`);
    }

    // Delete leases
    if (leaseCount > 0) {
      const deletedLeases = await Lease.destroy({
        where: { tenantId: { [Op.in]: tenantIds } },
        transaction
      });
      console.log(`   ✓ Deleted ${deletedLeases} lease(s)`);
    }

    // Finally, delete tenants
    const deletedTenants = await Tenant.destroy({
      where: { id: { [Op.in]: tenantIds } },
      transaction
    });
    console.log(`   ✓ Deleted ${deletedTenants} tenant(s)\n`);

    // Commit transaction
    await transaction.commit();

    // Step 5: Summary
    console.log('📊 Final Summary:');
    console.log(`   Tenants deleted: ${deletedTenants}`);
    console.log(`   Leases deleted: ${leaseCount}`);
    console.log(`   Invoices deleted: ${invoiceCount}`);
    console.log(`   Payments deleted: ${paymentCount}`);
    console.log(`   Tickets deleted: ${ticketCount}`);
    console.log('\n✅ FORCE cleanup complete!\n');

    process.exit(0);

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error during force cleanup:', error);
    console.log('\n🔄 Transaction rolled back. No data was deleted.\n');
    process.exit(1);
  }
}

// Confirmation prompt
console.log('\n⚠️  WARNING: You are about to FORCE DELETE all tenants without names!');
console.log('This action cannot be undone and will delete ALL associated data.\n');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

setTimeout(() => {
  forceCleanupTenants();
}, 5000);
