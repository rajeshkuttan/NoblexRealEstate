const { Property, Invoice, Lease, Unit, sequelize } = require('./src/models');

async function syncPropertyRevenue() {
  try {
    console.log('🚀 Starting Property Revenue Synchronization...');
    
    // Get all properties
    const properties = await Property.findAll();
    console.log(`Found ${properties.length} properties to process.`);

    for (const property of properties) {
      // Find all paid invoices for this property
      // We need to go through Units -> Leases -> Invoices
      const paidInvoices = await Invoice.findAll({
        where: { status: 'paid' },
        include: [{
          model: Lease,
          as: 'lease',
          required: true,
          include: [{
            model: Unit,
            as: 'unit',
            required: true,
            where: { propertyId: property.id }
          }]
        }]
      });

      const totalRevenue = paidInvoices.reduce((sum, inv) => sum + parseFloat(inv.totalAmount || 0), 0);
      
      const oldRevenue = parseFloat(property.actualRevenue || 0);
      
      if (oldRevenue !== totalRevenue) {
        await property.update({ actualRevenue: totalRevenue });
        console.log(`✅ Property ID ${property.id} (${property.title}): Updated revenue from ${oldRevenue} to ${totalRevenue}`);
      } else {
        console.log(`ℹ️ Property ID ${property.id} (${property.title}): Revenue is already correct (${totalRevenue})`);
      }
    }

    console.log('✨ Property Revenue Synchronization Completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

syncPropertyRevenue();
