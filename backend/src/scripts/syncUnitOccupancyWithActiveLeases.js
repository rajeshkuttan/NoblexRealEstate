const { sequelize, Unit, Lease } = require('../models');

async function syncUnitOccupancyWithActiveLeases() {
  const transaction = await sequelize.transaction();
  try {
    const units = await Unit.findAll({ transaction });
    const activeLeases = await Lease.findAll({
      where: { status: 'active' },
      attributes: ['unitId'],
      transaction,
      raw: true,
    });

    const activeUnitIds = new Set(activeLeases.map((lease) => String(lease.unitId)));
    let updatedToAvailable = 0;
    let updatedToOccupied = 0;

    for (const unit of units) {
      const hasActiveLease = activeUnitIds.has(String(unit.id));
      const currentStatus = String(unit.status || '').toLowerCase();

      if (hasActiveLease && currentStatus !== 'occupied') {
        await unit.update({ status: 'occupied' }, { transaction });
        updatedToOccupied += 1;
      } else if (!hasActiveLease && currentStatus === 'occupied') {
        await unit.update({ status: 'available' }, { transaction });
        updatedToAvailable += 1;
      }
    }

    await transaction.commit();
    console.log(JSON.stringify({ success: true, updatedToAvailable, updatedToOccupied }, null, 2));
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

syncUnitOccupancyWithActiveLeases();
