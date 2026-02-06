const { Payment } = require('../src/models');
const { sequelize } = require('../src/config/database');

async function deleteFirstPayment() {
  try {
    const payments = await Payment.findAll({
      order: [['id', 'ASC']],
      limit: 1
    });

    if (payments.length === 0) {
      console.log('No payments found.');
      return;
    }

    const firstPayment = payments[0];
    console.log(`Found payment: ID ${firstPayment.id}, Amount: ${firstPayment.amount}, InvoiceID: ${firstPayment.invoiceId}`);
    
    await firstPayment.destroy();
    console.log(`Successfully deleted payment with ID ${firstPayment.id}`);

  } catch (error) {
    console.error('Error deleting payment:', error);
  } finally {
    await sequelize.close();
  }
}

deleteFirstPayment();
