
const { Unit, Lease, sequelize } = require('./src/models/index.js');
const { Op } = require('sequelize');

async function syncUnitStatus() {
  const transaction = await sequelize.transaction();
  try {
    console.log('🔄 Starting Unit Status Sync...');

    // 1. Find all active leases
    const activeLeases = await Lease.findAll({
      where: { status: 'active' },
      attributes: ['id', 'unitId', 'leaseNumber'],
      transaction
    });

    console.log(`Found ${activeLeases.length} active leases.`);

    const occupiedUnitIds = activeLeases.map(l => l.unitId).filter(id => id);

    if (occupiedUnitIds.length === 0) {
      console.log('No units linked to active leases.');
      await transaction.rollback();
      return;
    }

    // 2. Update these units to 'occupied'
    const [updatedCount] = await Unit.update(
      { status: 'occupied' },
      { 
        where: { 
          id: { [Op.in]: occupiedUnitIds },
          status: { [Op.ne]: 'occupied' }
        },
        transaction
      }
    );

    console.log(`✅ Marked ${updatedCount} units as 'occupied'.`);
    
    await transaction.commit();
    console.log('Sync completed successfully.');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error during sync:', error);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

syncUnitStatus();
