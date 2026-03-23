const { Invoice } = require('./src/models');

(async () => {
    try {
        const testData = {
            invoiceNumber: `TEST-INV-${Date.now()}`,
            leaseId: 377,
            tenantId: 820,
            invoiceDate: new Date(),
            dueDate: new Date(),
            subtotal: 100,
            totalAmount: 105,
            status: 'draft',
            details: [
                { drCr: 'Dr', particular: 'Customer', ledger: '1', amount: 105, bill: 'none', narration: 'Test Dr' },
                { drCr: 'Cr', particular: 'Sales', ledger: '2', amount: 100, bill: 'none', narration: 'Test Cr' },
                { drCr: 'Cr', particular: 'VAT', ledger: '3', amount: 5, bill: 'none', narration: 'Test Tax' }
            ],
            items: { description: 'Test items' }
        };
        
        console.log('Creating test invoice...');
        const invoice = await Invoice.create(testData);
        console.log('Created Invoice ID:', invoice.id);
        console.log('Saved Details:', JSON.stringify(invoice.details, null, 2));
        
        const fetched = await Invoice.findByPk(invoice.id);
        console.log('Fetched Details:', JSON.stringify(fetched.details, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error('Test failed:', err.message);
        process.exit(1);
    }
})();
