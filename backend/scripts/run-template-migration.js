const { sequelize } = require('../src/config/database');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔵 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const migrationFile = '20260115_create_service_templates_table.js';
    const migrationPath = path.join(__dirname, '../src/migrations', migrationFile);

    console.log(`\n🔵 Running migration: ${migrationFile}`);
    
    const migration = require(migrationPath);
    
    try {
      await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
      console.log(`✅ Migration completed: ${migrationFile}\n`);
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
        console.log(`ℹ️  Migration already applied: ${migrationFile}\n`);
      } else {
        throw error;
      }
    }

    console.log('✅ Migration process completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
