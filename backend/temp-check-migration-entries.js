const fs = require('fs');
const path = require('path');
const { sequelize } = require('./src/config/database');
(async () => {
  const files = fs.readdirSync(path.join(__dirname, 'src/migrations')).filter(f => f.endsWith('.js')).sort();
  const [rows] = await sequelize.query('SELECT name FROM migrations ORDER BY id ASC');
  const executed = rows.map(r => r.name);
  const extras = executed.filter(name => !files.includes(name));
  console.log(JSON.stringify({ extraEntries: extras }, null, 2));
  await sequelize.close();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
