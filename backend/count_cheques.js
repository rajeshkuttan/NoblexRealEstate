const { Cheque } = require('./src/models');

async function countCheques() {
  try {
    const count = await Cheque.count();
    console.log(`Total Cheques in Database: ${count}`);
    
    // Optional: grouping by lease to see distribution
    const grouped = await Cheque.findAll({
        attributes: ['leaseId', [require('sequelize').fn('COUNT', 'id'), 'count']],
        group: ['leaseId']
    });
    console.log('Cheques per Lease:', JSON.stringify(grouped, null, 2));

  } catch (error) {
    console.error('Error counting cheques:', error);
  }
}

countCheques();
