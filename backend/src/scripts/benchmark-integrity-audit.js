/**
 * Benchmark integrity audit summary on current database.
 * Usage: node src/scripts/benchmark-integrity-audit.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../config.env') });

const { runFullIntegrityAudit } = require('../services/dataIntegrityAudit.service');
const { runPermissionAudit } = require('../services/permissionAudit.service');

(async () => {
  const start = Date.now();
  const data = await runFullIntegrityAudit({ summaryOnly: true });
  await runPermissionAudit({ maxRecords: 0 });
  const ms = Date.now() - start;
  console.log(`Integrity summary completed in ${ms}ms`);
  console.log(`Total violations: ${data.summary.total}`);
  console.log('By severity:', data.summary.bySeverity);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
