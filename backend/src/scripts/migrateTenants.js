
const { sequelize } = require('../config/database');
const Tenant = require('../models/Tenant');

async function migrate() {
  console.log('🔄 Loading configuration...');
  require('dotenv').config({ path: 'config.env' });

  try {
    console.log('🔄 Checking database connection...');
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    console.log('🔄 Syncing Tenant model...');
    // alter: true adds missing columns without dropping data
    await Tenant.sync({ alter: true });
    
    console.log('✅ Tenant table updated successfully with new columns.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
