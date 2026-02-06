const { sequelize } = require('../config/database');

const increasePacketSize = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // 64MB = 64 * 1024 * 1024 = 67108864
    await sequelize.query('SET GLOBAL max_allowed_packet=67108864;');
    console.log('✅ Increased max_allowed_packet to 64MB.');
    
    // Check the value
    const [results] = await sequelize.query("SHOW VARIABLES LIKE 'max_allowed_packet';");
    console.log('ℹ️ Current max_allowed_packet:', results[0].Value);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update configuration:', error);
    process.exit(1);
  }
};

increasePacketSize();
