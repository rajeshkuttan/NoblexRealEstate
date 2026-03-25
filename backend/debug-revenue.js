const { Invoice, Property, Lease, Unit, Payment, Tenant } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function debugRevenue() {
  try {
    console.log('--- Property Revenue Debug ---');
    
    const properties = await Property.findAll({
      attributes: ['id', 'title', 'actualRevenue']
    });
    
    console.log('Properties:');
    properties.forEach(p => {
      console.log(`ID: ${p.id}, Title: ${p.title}, Actual Revenue: ${p.actualRevenue}`);
    });

    const invoices = await Invoice.findAll();
    console.log('\nInvoices:');
    invoices.forEach(inv => {
      console.log(`ID: ${inv.id}, Num: ${inv.invoiceNumber}, Status: ${inv.status}, Total: ${inv.totalAmount}, LeaseID: ${inv.leaseId}`);
    });

    const payments = await Payment.findAll({
        include: [{ model: Tenant, as: 'tenant', attributes: ['name'] }]
    });
    console.log('\nPayments (Receipts):');
    payments.forEach(p => {
      console.log(`ID: ${p.id}, Num: ${p.paymentNumber}, Status: ${p.status}, Posted: ${p.isPosted}, Amount: ${p.amount}, Tenant: ${p.tenant?.name || 'N/A'}, InvoiceRef: ${p.reference}`);
      console.log(`  Details: ${p.details}`);
    });

    console.log('\n--- End Debug ---');
  } catch (err) {
    console.error('Debug failed:', err);
  } finally {
    process.exit();
  }
}

debugRevenue();
