
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { Unit, sequelize } = require('./backend/src/models/index.js');

async function checkUnits() {
  try {
    const units = await Unit.findAll({
      attributes: ['id', 'unitNumber', 'status']
    });
    console.log('Unit Statuses:', JSON.stringify(units, null, 2));
  } catch (error) {
    console.error('Error fetching units:', error);
  } finally {
    if (sequelize) {
      await sequelize.close();
    }
  }
}

checkUnits();
