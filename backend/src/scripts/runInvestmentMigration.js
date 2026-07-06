'use strict';

const { sequelize } = require('../config/database');
const migration = require('../migrations/20260626100000-create-investment-module');

(async () => {
  const queryInterface = sequelize.getQueryInterface();
  try {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('investment_assets')) {
      console.log('Investment tables already exist — skipping');
      process.exit(0);
    }
    await migration.up(queryInterface, require('sequelize'));
    console.log('Investment module migration completed');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
})();
