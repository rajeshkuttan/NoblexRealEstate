const { sequelize } = require('./src/config/database');
(async () => {
  const qi = sequelize.getQueryInterface();
  const leases = await qi.describeTable('leases');
  const properties = await qi.describeTable('properties');
  const accounts = await qi.describeTable('accounts_trans');
  const tables = await qi.showAllTables();
  console.log(JSON.stringify({
    leases: { duration: !!leases.duration, ejari_status: !!leases.ejari_status },
    properties: { compliance: !!properties.compliance, actual_revenue: !!properties.actual_revenue },
    accounts_trans: { particular_type: !!accounts.particular_type, particular_id: !!accounts.particular_id },
    legal_tables: { legal_cases: tables.includes('legal_cases'), audit_logs: tables.includes('audit_logs') }
  }, null, 2));
  await sequelize.close();
})().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
