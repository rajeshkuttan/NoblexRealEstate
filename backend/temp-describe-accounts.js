const { sequelize } = require('./src/config/database');
(async () => {
  const qi = sequelize.getQueryInterface();
  const info = await qi.describeTable('accounts_trans');
  console.log(JSON.stringify(Object.keys(info), null, 2));
  await sequelize.close();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
