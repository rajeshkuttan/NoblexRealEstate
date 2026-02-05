
const { Lease, sequelize } = require('./src/models/index.js');

async function listAllLeases() {
  try {
    const leases = await Lease.findAll({
      attributes: ['id', 'leaseNumber', 'status', 'unitId']
    });
    console.log('All Leases:', JSON.stringify(leases, null, 2));
  } catch (error) {
    console.error('Error fetching leases:', error);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

listAllLeases();
