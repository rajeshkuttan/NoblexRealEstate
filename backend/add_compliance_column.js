const { Sequelize } = require('sequelize');
const path = require('path');
const config = require(path.resolve(__dirname, 'src', 'config', 'database.config.js'))['development'];

async function run() {
  const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: config.dialect,
    logging: console.log
  });

  try {
    const queryInterface = sequelize.getQueryInterface();
    const tableInfo = await queryInterface.describeTable('properties');
    
    if (!tableInfo.compliance) {
      console.log('Adding compliance column...');
      await queryInterface.addColumn('properties', 'compliance', {
        type: Sequelize.JSON,
        allowNull: true
      });
      console.log('Column added successfully.');
    } else {
      console.log('Compliance column already exists.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

run();
