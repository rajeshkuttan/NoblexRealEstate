
const { sequelize } = require('../config/database');
const Lease = require('../models/Lease');

async function migrate() {
  console.log('🔄 Loading configuration...');
  require('dotenv').config({ path: 'config.env' });

  try {
    console.log('🔄 Checking database connection...');
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    console.log('🔄 Syncing Lease model...');
    // alter: true adds missing columns (property_type)
    await Lease.sync({ alter: true });
    
    console.log('✅ Lease table updated successfully with new columns.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
