const { sequelize } = require('../src/config/database');
const path = require('path');
const fs = require('fs');

async function runMigrations() {
  try {
    console.log('🔵 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Get migration files
    const migrationsPath = path.join(__dirname, '../src/migrations');
    const migrationFiles = [
      '20260115_create_services_table.js',
      '20260115_add_tax_rate_setting.js'
    ];

    console.log('\n🔵 Running migrations...\n');

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsPath, file);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️ Migration file not found: ${file}`);
        continue;
      }

      console.log(`🔵 Running migration: ${file}`);
      const migration = require(filePath);
      
      try {
        await migration.up(sequelize.getQueryInterface(), sequelize.Sequelize);
        console.log(`✅ Migration completed: ${file}\n`);
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log(`ℹ️ Migration already applied: ${file}\n`);
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ All migrations completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigrations();
