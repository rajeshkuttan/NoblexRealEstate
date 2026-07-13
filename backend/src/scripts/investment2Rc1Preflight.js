'use strict';

/**
 * Preflight checks before Investment2 RC1 packaging/deploy.
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { getInvestmentV2ReleaseConfig } = require('../config/investmentV2ReleaseConfig');

async function main() {
  const cfg = getInvestmentV2ReleaseConfig();
  const checks = [];
  checks.push({ name: 'config_loaded', ok: true, detail: cfg.releaseStage });
  checks.push({ name: 'v2_enabled', ok: cfg.enabled, detail: cfg.enabled });
  checks.push({
    name: 'migration_file',
    ok: fs.existsSync(
      path.join(__dirname, '../migrations/20260714010000-investment-rc1-migration-batches.js')
    ),
  });
  checks.push({
    name: 'migrate_service',
    ok: fs.existsSync(path.join(__dirname, '../services/investment/migration/rc1Migrate.service.js')),
  });

  try {
    const { sequelize } = require('../config/database');
    await sequelize.authenticate();
    checks.push({ name: 'database', ok: true });
    await sequelize.close().catch(() => {});
  } catch (e) {
    checks.push({ name: 'database', ok: false, detail: e.message });
  }

  const pass = checks.every((c) => c.ok);
  const release = path.join(__dirname, '../../../Tasks/Release');
  fs.mkdirSync(release, { recursive: true });
  fs.writeFileSync(
    path.join(release, 'Investment2_RC1_Deployment_Report.md'),
    [
      '# Investment2 RC1 Deployment Report',
      '',
      `**Overall:** ${pass ? 'PASS' : 'FAIL'}`,
      `**Phase:** preflight`,
      `**Captured:** ${new Date().toISOString()}`,
      '',
      ...checks.map((c) => `- ${c.ok ? 'PASS' : 'FAIL'} — ${c.name}${c.detail != null ? `: ${c.detail}` : ''}`),
      '',
      'Post-deploy: run migrate, sync:rbac, PM2 reload. Do **not** auto-seed.',
      '',
    ].join('\n')
  );
  console.log(JSON.stringify({ pass, checks }, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
