const path = require('path');
const fs = require('fs');

// Determine which config file to load based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';

// Load environment variables
const dotenvPath = path.join(__dirname, '../../.env');
const productionConfigPath = path.join(__dirname, '../../config.production.env');
const devConfigPath = path.join(__dirname, '../../config.env');

let configPath;
if (fs.existsSync(dotenvPath)) {
  configPath = dotenvPath;
} else if (nodeEnv === 'production' && fs.existsSync(productionConfigPath)) {
  configPath = productionConfigPath;
} else {
  configPath = devConfigPath;
}

require('dotenv').config({ path: configPath });

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Leasemanagement',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Leasemanagement',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false
  }
};
