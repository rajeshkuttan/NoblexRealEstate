const { sequelize } = require('../src/config/database');

async function fixSchema() {
  try {
    console.log('Starting schema fix...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('Connected to database.');



    // Fix Phone Column - Increase size
    try {
      await sequelize.query(`ALTER TABLE users MODIFY COLUMN phone VARCHAR(50);`);
      console.log('✅ Phone column updated to VARCHAR(50)');
    } catch (err) {
      console.error('❌ Failed to update phone column:', err.message);
    }

    // Fix Role Column - Change to VARCHAR to accept new roles without ENUM restrictions issues
    // or Update ENUM definition.
    // Safest approach to fix "truncated" immediately is usually changing to VARCHAR, 
    // but let's try to update the ENUM first. 
    // Actually, converting to VARCHAR(50) is often better for flexibility unless strictly required.
    // Let's stick to the requested roles.
    
    // For MySQL, modifying ENUM requires listing all values.
    try {
      await sequelize.query(`
        ALTER TABLE users MODIFY COLUMN role ENUM(
          'admin', 
          'agent', 
          'manager', 
          'finance_manager', 
          'finance_executive', 
          'operations_executive', 
          'maintenance_contractor', 
          'tenant',
          'viewer'
        ) DEFAULT 'agent';
      `);
      console.log('✅ Role column updated with new ENUM values');
    } catch (err) {
      console.error('❌ Failed to update role column:', err.message);
      
      // Fallback: If ENUM update fails, try changing to VARCHAR
      try {
        await sequelize.query(`ALTER TABLE users MODIFY COLUMN role VARCHAR(50) DEFAULT 'agent';`);
        console.log('⚠️ Role column changed to VARCHAR(50) as fallback');
      } catch (e) {
          console.error('❌ Failed to fallback role to VARCHAR:', e.message);
      }
    }

    // Fix Tickets Table - Category Column
    try {
      await sequelize.query(`ALTER TABLE tickets MODIFY COLUMN category VARCHAR(50);`);
      console.log('✅ Tickets category column updated to VARCHAR(50)');
    } catch (err) {
      console.error('❌ Failed to update Tickets category column:', err.message);
    }

    console.log('Schema fix completed.');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

fixSchema();
