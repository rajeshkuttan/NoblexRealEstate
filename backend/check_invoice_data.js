const { Invoice } = require('./src/models');

(async () => {
    try {
        const invoice = await Invoice.findOne({
            order: [['id', 'DESC']]
        });
        
        if (invoice) {
            console.log('Last Invoice ID:', invoice.id);
            console.log('Invoice Details:', JSON.stringify(invoice.details, null, 2));
            console.log('Invoice Items:', JSON.stringify(invoice.items, null, 2));
        } else {
            console.log('No invoices found');
        }
        
        process.exit(0);
    } catch (err) {
        console.error('Fetch failed:', err.message);
        process.exit(1);
    }
})();
