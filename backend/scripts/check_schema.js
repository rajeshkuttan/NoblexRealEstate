const { sequelize } = require('../src/config/database');

async function checkSchema() {
  try {
    const [results, metadata] = await sequelize.query("DESCRIBE payments");
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Error describing table:', error);
  } finally {
    await sequelize.close();
  }
}

checkSchema();
