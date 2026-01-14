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

const { Property, Unit, Lease, Invoice, Payment, Ticket } = require('../src/models');
const { sequelize } = require('../src/config/database');
const { Op } = require('sequelize');

async function deletePropertiesExceptKuttanTower() {
  console.log('\n⚠️  ⚠️  ⚠️  CRITICAL WARNING ⚠️  ⚠️  ⚠️');
  console.log('\nYou are about to DELETE ALL PROPERTIES EXCEPT "KUTTAN TOWER"!');
  console.log('This action CANNOT be undone!');
  console.log('\nThis will remove:');
  console.log('  - All properties except "KUTTAN TOWER"');
  console.log('  - All units belonging to deleted properties');
  console.log('  - All leases associated with those units');
  console.log('  - All invoices associated with those leases');
  console.log('  - All payments associated with those leases');
  console.log('  - All tickets associated with those leases');
  console.log('\n"KUTTAN TOWER" property and its units will be PRESERVED.');

  // Countdown
  for (let i = 10; i >= 0; i--) {
    process.stdout.write(`\r⏳ Starting in ${i} seconds... `);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('\n🚀 Starting cleanup...\n');

  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.\n');

    // Find "KUTTAN TOWER" property
    const kuttanTower = await Property.findOne({
      where: {
        title: {
          [Op.like]: '%KUTTAN TOWER%'
        }
      }
    });

    if (!kuttanTower) {
      console.log('⚠️  WARNING: "KUTTAN TOWER" property not found in database!');
      console.log('📋 Searching for properties with similar names...\n');
      
      const allProperties = await Property.findAll({
        attributes: ['id', 'title'],
        limit: 20
      });
      
      console.log('📋 Available properties:');
      allProperties.forEach(prop => {
        console.log(`   - ID: ${prop.id}, Title: "${prop.title}"`);
      });
      
      console.log('\n❌ Cannot proceed without identifying "KUTTAN TOWER".');
      console.log('💡 Please verify the exact property name and update the script if needed.');
      process.exit(1);
    }

    console.log(`✅ Found "KUTTAN TOWER": ID ${kuttanTower.id}, Title: "${kuttanTower.title}"`);
    console.log(`📌 This property will be PRESERVED.\n`);

    let propertyCount, unitCount, leaseCount, invoiceCount, paymentCount, ticketCount;
    let propertiesToDelete;

    // Use transaction for atomicity
    await sequelize.transaction(async (t) => {
      // Find all properties except KUTTAN TOWER
      propertiesToDelete = await Property.findAll({
        where: {
          id: {
            [Op.ne]: kuttanTower.id
          }
        },
        transaction: t
      });

      propertyCount = propertiesToDelete.length;

      if (propertyCount === 0) {
        console.log('ℹ️  No properties to delete. Only "KUTTAN TOWER" exists.');
        return;
      }

      const propertyIds = propertiesToDelete.map(p => p.id);

      // Find units belonging to these properties
      const unitsToDelete = await Unit.findAll({
        where: { propertyId: propertyIds },
        transaction: t
      });
      const unitIds = unitsToDelete.map(u => u.id);
      unitCount = unitsToDelete.length;

      // Find leases for these units
      const leasesToDelete = await Lease.findAll({
        where: { unitId: unitIds },
        transaction: t
      });
      const leaseIds = leasesToDelete.map(l => l.id);
      leaseCount = leasesToDelete.length;

      // Count related records
      invoiceCount = leaseIds.length > 0 ? await Invoice.count({ where: { leaseId: leaseIds }, transaction: t }) : 0;
      paymentCount = leaseIds.length > 0 ? await Payment.count({ where: { leaseId: leaseIds }, transaction: t }) : 0;
      // Note: Tickets are linked via unitId
      ticketCount = unitIds.length > 0 ? await Ticket.count({ where: { unitId: unitIds }, transaction: t }) : 0;

      console.log('📋 Data to be deleted:');
      console.log(`   Properties: ${propertyCount}`);
      console.log(`   Units: ${unitCount}`);
      console.log(`   Leases: ${leaseCount}`);
      console.log(`   Invoices: ${invoiceCount}`);
      console.log(`   Payments: ${paymentCount}`);
      console.log(`   Tickets: ${ticketCount}`);
      console.log(`   TOTAL RECORDS: ${propertyCount + unitCount + leaseCount + invoiceCount + paymentCount + ticketCount}\n`);

      console.log('📋 Properties to be deleted:');
      propertiesToDelete.slice(0, 10).forEach(prop => {
        console.log(`   - ID: ${prop.id}, Title: "${prop.title}"`);
      });
      if (propertyCount > 10) {
        console.log(`   ... and ${propertyCount - 10} more\n`);
      } else {
        console.log('');
      }

      console.log('🗑️  Starting deletion process...');

      // Delete in order of foreign key dependencies
      if (leaseIds.length > 0) {
        // 1. Delete payments first (references leases)
        const deletedPayments = await Payment.destroy({ 
          where: { leaseId: leaseIds }, 
          transaction: t 
        });
        console.log(`   ✓ Deleted ${deletedPayments} payment(s)`);

        // 2. Delete invoices (references leases)
        const deletedInvoices = await Invoice.destroy({ 
          where: { leaseId: leaseIds }, 
          transaction: t 
        });
        console.log(`   ✓ Deleted ${deletedInvoices} invoice(s)`);

        // 3. Delete leases (references units)
        const deletedLeases = await Lease.destroy({ 
          where: { unitId: unitIds }, 
          transaction: t 
        });
        console.log(`   ✓ Deleted ${deletedLeases} lease(s)`);
      }
      
      // 4. Delete tickets (references units)
      if (unitIds.length > 0) {
        const deletedTickets = await Ticket.destroy({ 
          where: { unitId: unitIds }, 
          transaction: t 
        });
        console.log(`   ✓ Deleted ${deletedTickets} ticket(s)`);
      }

      // 5. Delete units (references properties)
      if (unitIds.length > 0) {
        const deletedUnits = await Unit.destroy({ 
          where: { propertyId: propertyIds }, 
          transaction: t 
        });
        console.log(`   ✓ Deleted ${deletedUnits} unit(s)`);
      }

      // 6. Finally delete properties
      const deletedProperties = await Property.destroy({ 
        where: { id: propertyIds }, 
        transaction: t 
      });
      console.log(`   ✓ Deleted ${deletedProperties} propertie(s)`);

      console.log('\n✅ Transaction committed successfully!');
    });

    // Verify deletion
    const remainingProperties = await Property.count();
    const kuttanTowerStillExists = await Property.findByPk(kuttanTower.id);
    const remainingUnits = await Unit.count();
    const remainingLeases = await Lease.count();
    const remainingInvoices = await Invoice.count();
    const remainingPayments = await Payment.count();
    const remainingTickets = await Ticket.count();

    console.log('\n🔍 Verifying deletion...');
    console.log('\n📊 Remaining records:');
    console.log(`   Properties: ${remainingProperties}`);
    console.log(`   Units: ${remainingUnits}`);
    console.log(`   Leases: ${remainingLeases}`);
    console.log(`   Invoices: ${remainingInvoices}`);
    console.log(`   Payments: ${remainingPayments}`);
    console.log(`   Tickets: ${remainingTickets}`);

    console.log('\n✅ Verification:');
    if (kuttanTowerStillExists) {
      console.log(`   ✓ "KUTTAN TOWER" (ID: ${kuttanTower.id}) has been PRESERVED`);
    } else {
      console.log(`   ❌ ERROR: "KUTTAN TOWER" was accidentally deleted!`);
    }

    console.log('\n📊 Deletion Summary:');
    console.log(`   ✓ Properties deleted: ${propertyCount || 0}`);
    console.log(`   ✓ Units deleted: ${unitCount || 0}`);
    console.log(`   ✓ Leases deleted: ${leaseCount || 0}`);
    console.log(`   ✓ Invoices deleted: ${invoiceCount || 0}`);
    console.log(`   ✓ Payments deleted: ${paymentCount || 0}`);
    console.log(`   ✓ Tickets deleted: ${ticketCount || 0}`);
    console.log(`   ✓ TOTAL DELETED: ${
      (propertyCount || 0) +
      (unitCount || 0) +
      (leaseCount || 0) +
      (invoiceCount || 0) +
      (paymentCount || 0) +
      (ticketCount || 0)
    } records`);

    console.log('\n✅ SUCCESS: All properties except "KUTTAN TOWER" have been removed!');
    console.log('\n📌 Preserved:');
    console.log(`   - Property: "${kuttanTower.title}" (ID: ${kuttanTower.id})`);
    console.log(`   - Its units (if any)`);
    console.log(`   - All tenants\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    console.log('\n🔄 Transaction rolled back. No data was deleted.');
    process.exit(1);
  }
}

// Run the cleanup
deletePropertiesExceptKuttanTower();
