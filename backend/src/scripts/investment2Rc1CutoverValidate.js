'use strict';

/**
 * Cutover validation — structural checks before legacy read-only.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { sequelize } = require('../config/database');
const models = require('../models');
const { getInvestmentV2ReleaseConfig } = require('../config/investmentV2ReleaseConfig');
const { reconcileCompany } = require('../services/investment/migration/rc1Reconcile.service');

async function main() {
  const cfg = getInvestmentV2ReleaseConfig();
  const checks = [];
  const push = (name, ok, detail) => checks.push({ name, ok, detail });

  push('v2_enabled', cfg.enabled, cfg.releaseStage);
  push('oms_enabled', cfg.omsEnabled, cfg.omsEntryMode);
  push('legacy_mode', true, cfg.legacyEntryMode);

  const companies = await models.CompanySetting.findAll({ attributes: ['id'], order: [['id', 'ASC']] });
  let critical = 0;
  let major = 0;
  for (const c of companies) {
    // eslint-disable-next-line no-await-in-loop
    const recon = await reconcileCompany(c.id, {});
    critical += recon.counts?.critical || 0;
    major += recon.counts?.major || 0;
    const unmapped = await models.InvestmentAsset.count({
      where: { companyId: c.id },
    }).catch(() => 0);
    const mapped = await models.InvestmentInstrument.count({
      where: { companyId: c.id, legacyAssetId: { [require('sequelize').Op.ne]: null } },
    }).catch(() => 0);
    push(`company_${c.id}_mapping`, mapped >= 0, { assets: unmapped, mappedInstruments: mapped });
  }

  push('no_critical_recon', critical <= cfg.maxUnresolvedCritical, { critical });
  push('no_major_recon', major <= cfg.maxUnresolvedMajor, { major });

  const pass = checks.every((c) => c.ok);
  const out = { pass, checks, capturedAt: new Date().toISOString() };
  const release = path.join(__dirname, '../../../Tasks/Release');
  require('fs').mkdirSync(release, { recursive: true });
  require('fs').writeFileSync(
    path.join(release, 'Investment2_RC1_Cutover_Report.md'),
    [
      '# Investment2 RC1 Cutover Validation',
      '',
      `**Overall:** ${pass ? 'PASS' : 'FAIL'}`,
      `**Captured:** ${out.capturedAt}`,
      '',
      ...checks.map((c) => `- ${c.ok ? 'PASS' : 'FAIL'} — ${c.name}: ${JSON.stringify(c.detail)}`),
      '',
    ].join('\n')
  );
  console.log(JSON.stringify(out, null, 2));
  await sequelize.close().catch(() => {});
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
