const { sequelize, User, Lead, Property, LeadProperty, LeadActivity } = require('../models');
const { syncDatabase } = require('../config/database');

const migrate = async () => {
  try {
    console.log('🔄 Starting database migration...');
    
    // Sync database (create tables)
    const synced = await syncDatabase(true); // Force sync to recreate tables
    
    if (synced) {
      console.log('✅ Database migration completed successfully!');
      console.log('📊 Tables created:');
      console.log('   - users');
      console.log('   - leads');
      console.log('   - properties');
      console.log('   - lead_properties');
      console.log('   - lead_activities');
    } else {
      console.error('❌ Database migration failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

migrate();
