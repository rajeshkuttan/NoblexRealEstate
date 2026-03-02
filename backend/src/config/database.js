const { Sequelize } = require('sequelize');
const config = require('./config');

// Create Sequelize instance
const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'mysql',
    logging: false, // Set to console.log to see SQL queries
    pool: {
      max: 25,
      min: 5,
      acquire: 60000,
      idle: 5000
    }
  }
);

// Test database connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
};

// Sync database (create tables if they don't exist)
const syncDatabase = async () => {
  try {
    await sequelize.sync(); // Removed alter: true to prevent index duplication errors
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    return false;
  }
};

module.exports = { sequelize, Sequelize, testConnection, syncDatabase };
