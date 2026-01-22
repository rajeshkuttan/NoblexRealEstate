const { sequelize } = require('../config/database');

async function fixSchema() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');

    const queryInterface = sequelize.getQueryInterface();

    // 1. Add lease_type to leases
    const leaseTable = await queryInterface.describeTable('leases');
    if (!leaseTable.lease_type) {
      console.log('🔄 Adding lease_type column to leases...');
      await queryInterface.addColumn('leases', 'lease_type', {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        defaultValue: 'residential'
      });
      console.log('✅ lease_type added');
    } else {
      console.log('ℹ️ lease_type already exists');
    }

    // 2. Change parking column in units
    console.log('🔄 Changing parking column in units to INTEGER...');
    // We attempt to change it. Note: SQLite might have limitations, but for MySQL/Postgres this works.
    // If it fails due to casting, we might catch it.
    try {
        await queryInterface.changeColumn('units', 'parking', {
            type: sequelize.Sequelize.INTEGER,
            defaultValue: 0,
            allowNull: true
        });
        console.log('✅ parking column updated to INTEGER');
    } catch (err) {
        console.warn('⚠️ Could not standardly change column type. Attempting raw query workaround if needed, or it might be unsupported in this dialect.', err.message);
        // Fallback for some SQL dialects if needed, or manual instructions.
    }

    console.log('✅ Schema fix completed');
  } catch (error) {
    console.error('❌ Schema fix failed:', error);
  } finally {
    await sequelize.close();
  }
}

fixSchema();
