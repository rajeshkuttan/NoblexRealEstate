const { sequelize } = require('./backend/src/config/database');

async function fixEnum() {
  try {
    console.log('Attempting to fix ENUM for status in journal_vouchers table...');
    // We need to use raw query because alter:true often fails for ENUM changes in MySQL
    await sequelize.query("ALTER TABLE journal_vouchers MODIFY COLUMN status ENUM('open', 'posted', 'cancelled') DEFAULT 'open'");
    console.log('✅ Success: ENUM updated to include "open"');
    
    // Also check if any existing 'draft' records need to be updated (though there likely aren't any if it was failing)
    await sequelize.query("UPDATE journal_vouchers SET status = 'open' WHERE status = 'draft'");
    console.log('✅ Success: Existing draft records migrated to open');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing ENUM:', error.message);
    process.exit(1);
  }
}

fixEnum();
