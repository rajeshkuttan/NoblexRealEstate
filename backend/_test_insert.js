require('dotenv').config({ path: './config.env' });
const { Lease, sequelize } = require('./src/models');

(async () => {
  try {
    await Lease.create({
      leaseNumber: 'TEST-DELETE-ME',
      leaseType: 'residential',
      tenantId: 14257,
      unitId: 5080,
      startDate: '2025-07-26',
      endDate: '2026-07-25',
      duration: 12,
      rentAmount: 15000,
      depositAmount: 0,
      paymentFrequency: 'annually',
      paymentDay: 1,
      status: 'active',
      isActive: true,
    });
    console.log('INSERT OK');
    await Lease.destroy({ where: { leaseNumber: 'TEST-DELETE-ME' } });
    console.log('Cleaned up');
  } catch (e) {
    console.error('INSERT FAILED:', e.message);
  } finally {
    await sequelize.close();
  }
})();
