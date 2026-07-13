'use strict';

/**
 * Post-deploy smoke (no migration, no seed).
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { publicReleaseStatus } = require('../config/investmentV2ReleaseConfig');

async function main() {
  const status = publicReleaseStatus();
  const checks = [
    { name: 'release_status', ok: status.enabled, detail: status },
  ];
  try {
    const { sequelize } = require('../config/database');
    await sequelize.authenticate();
    const [rows] = await sequelize.query(
      "SELECT COUNT(*) AS c FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'investment_migration_batches'"
    );
    const present = Number(rows?.[0]?.c || rows?.[0]?.C || 0) > 0;
    checks.push({ name: 'rc1_tables', ok: present, detail: present });
    await sequelize.close().catch(() => {});
  } catch (e) {
    checks.push({ name: 'database', ok: false, detail: e.message });
  }

  const pass = checks.every((c) => c.ok);
  const release = path.join(__dirname, '../../../Tasks/Release');
  fs.mkdirSync(release, { recursive: true });
  const existing = path.join(release, 'Investment2_RC1_Deployment_Report.md');
  const append = [
    '',
    '## Post-deploy',
    `**Overall:** ${pass ? 'PASS' : 'FAIL'}`,
    `**Captured:** ${new Date().toISOString()}`,
    ...checks.map((c) => `- ${c.ok ? 'PASS' : 'FAIL'} — ${c.name}`),
    '',
  ].join('\n');
  if (fs.existsSync(existing)) fs.appendFileSync(existing, append);
  else fs.writeFileSync(existing, `# Investment2 RC1 Deployment Report\n\n**Overall:** ${pass ? 'PASS' : 'FAIL'}\n${append}`);

  console.log(JSON.stringify({ pass, status, checks }, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
