const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Initialize Sequelize
const sequelize = new Sequelize(
  'HoldingDB',
  'root',
  '',
  {
    host: 'localhost',
    dialect: 'mysql',
    logging: false,
  }
);

async function cleanupData() {
  try {
    // Delete all Goods Receipts
    console.log('Deleting all Goods Receipts...');
    await sequelize.query('DELETE FROM goods_receipts');
    console.log('Goods Receipts deleted.');

    // Delete all Purchase Orders
    console.log('Deleting all Purchase Orders...');
    await sequelize.query('DELETE FROM purchase_orders');
    console.log('Purchase Orders deleted.');

    console.log('Data cleanup completed successfully.');
  } catch (error) {
    console.error('Error cleaning up data:', error);
  } finally {
    await sequelize.close();
  }
}

cleanupData();
