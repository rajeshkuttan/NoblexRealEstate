const { BankAccount, Investment, Invoice, Payment } = require('./src/models');

async function checkData() {
  try {
    const bankCount = await BankAccount.count();
    const bankSum = await BankAccount.sum('currentBalance') || 0;
    
    const investmentCount = await Investment.count();
    const investmentSum = await Investment.sum('currentValue') || 0;
    
    const invoiceCount = await Invoice.count();
    const paymentCount = await Payment.count();

    console.log('--- Database Check ---');
    console.log(`Bank Accounts: ${bankCount} (Total Balance: ${bankSum})`);
    console.log(`Investments: ${investmentCount} (Total Value: ${investmentSum})`);
    console.log(`Invoices: ${invoiceCount}`);
    console.log(`Payments: ${paymentCount}`);
    
    if (bankCount > 0) {
      const accounts = await BankAccount.findAll({ attributes: ['bankName', 'currentBalance'] });
      console.log('Bank Details:');
      accounts.forEach(a => console.log(` - ${a.bankName}: ${a.currentBalance}`));
    }

    if (investmentCount > 0) {
        const investments = await Investment.findAll({ attributes: ['investmentNumber', 'currentValue'] });
        console.log('Investment Details:');
        investments.forEach(i => console.log(` - ${i.investmentNumber}: ${i.currentValue}`));
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkData();
