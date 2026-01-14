/**
 * Cleanup Script: Delete Tenants Without Names
 * 
 * This script identifies and deletes tenant records that have:
 * - NULL name
 * - Empty string name
 * - Only whitespace in name
 * 
 * Usage: node scripts/cleanup-tenants.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

const { Tenant, Lease } = require('../src/models');
const { Op } = require('sequelize');

async function cleanupTenants() {
  try {
    console.log('🔍 Starting tenant cleanup process...\n');

    // Step 1: Find tenants without valid names
    const tenantsToDelete = await Tenant.findAll({
      where: {
        [Op.or]: [
          { name: null },
          { name: '' },
          { name: { [Op.regexp]: '^[\\s]*$' } } // Only whitespace
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
      process.exit(0);
    }

    // Step 2: Display tenants to be deleted
    console.log('📋 Tenants to be deleted:\n');
    tenantsToDelete.forEach((tenant, index) => {
      console.log(`${index + 1}. ID: ${tenant.id}`);
      console.log(`   Email: ${tenant.email || 'N/A'}`);
      console.log(`   Phone: ${tenant.phone || 'N/A'}`);
      console.log(`   Name: "${tenant.name}"`);
      console.log(`   Has Leases: ${tenant.leases?.length > 0 ? 'YES (' + tenant.leases.length + ')' : 'NO'}`);
      console.log(`   Created: ${tenant.created_at}\n`);
    });

    // Step 3: Check for tenants with active leases
    const tenantsWithLeases = tenantsToDelete.filter(t => t.leases?.length > 0);
    if (tenantsWithLeases.length > 0) {
      console.log(`⚠️  WARNING: ${tenantsWithLeases.length} tenant(s) have active leases!`);
      console.log('   These tenants will NOT be deleted to preserve data integrity.\n');
    }

    // Step 4: Separate tenants without leases (safe to delete)
    const safeToDelete = tenantsToDelete.filter(t => !t.leases || t.leases.length === 0);
    
    if (safeToDelete.length === 0) {
      console.log('⚠️  All tenants without names have active leases.');
      console.log('   Cannot delete to preserve data integrity.\n');
      process.exit(0);
    }

    console.log(`✅ Safe to delete: ${safeToDelete.length} tenant(s) without leases\n`);

    // Step 5: Delete tenants without leases
    const idsToDelete = safeToDelete.map(t => t.id);
    
    const deletedCount = await Tenant.destroy({
      where: {
        id: {
          [Op.in]: idsToDelete
        }
      }
    });

    console.log(`\n🗑️  Successfully deleted ${deletedCount} tenant(s)\n`);

    // Step 6: Summary
    console.log('📊 Summary:');
    console.log(`   Total found: ${tenantsToDelete.length}`);
    console.log(`   With leases (kept): ${tenantsWithLeases.length}`);
    console.log(`   Deleted: ${deletedCount}`);
    console.log('\n✅ Cleanup complete!\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupTenants();
