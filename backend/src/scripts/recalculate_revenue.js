/**
 * Recalculate Actual Revenue Script
 * 
 * This script iterates through all properties and calculates their total actual revenue
 * by summing up all associated 'paid' invoices.
 * 
 * Usage: node src/scripts/recalculate_revenue.js
 */

require('dotenv').config({ path: './config.env' });
const { Property, Unit, Lease, Invoice, sequelize } = require('../models');

async function recalculateAllProperties() {
  console.log('🚀 Starting Property Actual Revenue Recalculation...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established.');

    const properties = await Property.findAll({
      include: [{
        model: Unit,
        as: 'units',
        include: [{
          model: Lease,
          as: 'leases',
          include: [{
            model: Invoice,
            as: 'invoices',
            where: { status: 'paid' },
            required: false
          }]
        }]
      }]
    });

    console.log(`Found ${properties.length} properties to process.`);

    for (const property of properties) {
      let totalRevenue = 0;
      
      if (property.units) {
        for (const unit of property.units) {
          if (unit.leases) {
            for (const lease of unit.leases) {
              if (lease.invoices) {
                for (const invoice of lease.invoices) {
                  totalRevenue += parseFloat(invoice.totalAmount || 0);
                }
              }
            }
          }
        }
      }

      await property.update({ actualRevenue: totalRevenue });
      console.log(`✅ Property ID: ${property.id} (${property.title}) - Actual Revenue updated to: ${totalRevenue}`);
    }

    console.log('\n✨ Recalculation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during recalculation:', error);
    process.exit(1);
  }
}

recalculateAllProperties();
