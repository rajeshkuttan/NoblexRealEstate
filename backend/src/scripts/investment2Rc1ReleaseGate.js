'use strict';

/**
 * Investment 2.0 RC1 release gate.
 * Verdicts: PRODUCTION_LIVE | PRODUCTION_PILOT | RELEASE_BLOCKED | ROLLBACK_REQUIRED
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { getInvestmentV2ReleaseConfig, isLegacyReadOnly } = require('../config/investmentV2ReleaseConfig');

const RELEASE = path.join(__dirname, '../../../Tasks/Release');

const REQUIRED_FOR_PILOT = [
  'Investment2_RC1_Deployment_Report.md',
  'Investment2_RC1_Backup_Report.md',
  'Investment2_RC1_Baseline.md',
  'Investment2_RC1_Migration_Report.md',
  'Investment2_RC1_Holdings_Reconciliation.md',
  'Investment2_RC1_Security_Report.md',
  'Investment2_RC1_Known_Limitations.md',
  'Investment2_RC1_Rollback_Plan.md',
];

const REQUIRED_FOR_LIVE = [
  ...REQUIRED_FOR_PILOT,
  'Investment2_RC1_GL_Reconciliation.md',
  'Investment2_RC1_Partner_Capital_Reconciliation.md',
  'Investment2_RC1_NAV_Reconciliation.md',
  'Investment2_RC1_OMS_Pilot_Report.md',
  'Investment2_RC1_UAT_Signoff.md',
  'Investment2_RC1_Cutover_Report.md',
  'Investment2_RC1_Performance_Report.md',
];

function reportHasPass(file) {
  const p = path.join(RELEASE, file);
  if (!fs.existsSync(p)) return false;
  const text = fs.readFileSync(p, 'utf8');
  return /\*\*Overall:\*\*\s*PASS/i.test(text) || /Overall:\s*PASS/i.test(text);
}

function parseUatSignoffs(text) {
  const roles = ['Investment Operations', 'Finance', 'Treasury', 'Risk/Compliance', 'Management'];
  const done = {};
  for (const role of roles) {
    const re = new RegExp(
      `\\|\\s*${role.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\|\\s*([^|]+)\\s*\\|\\s*([^|]+)\\s*\\|\\s*([^|]+)\\s*\\|`,
      'i'
    );
    const m = text.match(re);
    if (!m) {
      done[role] = false;
      continue;
    }
    const name = m[1].trim();
    const date = m[2].trim();
    const result = m[3].trim().toLowerCase();
    done[role] = Boolean(
      name &&
        date &&
        !name.includes('_') &&
        (result.includes('pass') || result.includes('approved') || result.includes('signed'))
    );
  }
  return done;
}

function main() {
  const cfg = getInvestmentV2ReleaseConfig();
  const missingPilot = REQUIRED_FOR_PILOT.filter((f) => !fs.existsSync(path.join(RELEASE, f)));
  const missingLive = REQUIRED_FOR_LIVE.filter((f) => !fs.existsSync(path.join(RELEASE, f)));

  let verdict = 'RELEASE_BLOCKED';
  const reasons = [];

  if (missingPilot.length) {
    reasons.push(`Missing pilot evidence: ${missingPilot.join(', ')}`);
  }

  const reconJson = path.join(RELEASE, 'evidence', 'investment2-rc1-reconciliation.json');
  let critical = 0;
  let major = 0;
  if (fs.existsSync(reconJson)) {
    try {
      const data = JSON.parse(fs.readFileSync(reconJson, 'utf8'));
      const companies = data.companies || [];
      for (const c of companies) {
        // Only migration-created differences block release (pre-existing disclosed separately)
        const glCrit = (c.gl?.critical || []).filter(
          (x) => x.differenceCategory === 'MIGRATION_DIFFERENCE'
        );
        critical += glCrit.length;
        major += Number(c.counts?.majorHoldings || 0) + Number(c.counts?.majorPartners || 0);
        // Unmapped legacy after dry-run/migrate is major until resolved, but seed/demo gaps
        // on local staging should not force ROLLBACK — still counted as major for LIVE gate.
      }
    } catch (_e) {
      reasons.push('Reconciliation evidence unreadable');
    }
  }

  if (critical > cfg.maxUnresolvedCritical) {
    reasons.push(`Unresolved critical: ${critical}`);
    verdict = critical > 5 ? 'ROLLBACK_REQUIRED' : 'RELEASE_BLOCKED';
  }
  if (major > cfg.maxUnresolvedMajor) {
    reasons.push(`Unresolved major: ${major}`);
  }

  const pilotOk =
    missingPilot.length === 0 &&
    critical <= cfg.maxUnresolvedCritical &&
    major <= cfg.maxUnresolvedMajor &&
    cfg.omsEntryMode === 'pilot' &&
    !isLegacyReadOnly();

  const uatPath = path.join(RELEASE, 'Investment2_RC1_UAT_Signoff.md');
  let uatOk = false;
  if (fs.existsSync(uatPath)) {
    const signoffs = parseUatSignoffs(fs.readFileSync(uatPath, 'utf8'));
    uatOk = Object.values(signoffs).every(Boolean);
    if (!uatOk) reasons.push(`UAT incomplete: ${JSON.stringify(signoffs)}`);
  } else {
    reasons.push('UAT sign-off missing');
  }

  const cutoverPass = reportHasPass('Investment2_RC1_Cutover_Report.md');
  const liveReady =
    missingLive.length === 0 &&
    uatOk &&
    cutoverPass &&
    isLegacyReadOnly() &&
    cfg.omsEntryMode === 'production' &&
    critical <= cfg.maxUnresolvedCritical &&
    major <= cfg.maxUnresolvedMajor;

  if (liveReady) {
    verdict = 'PRODUCTION_LIVE';
  } else if (pilotOk && !reasons.some((r) => r.startsWith('Unresolved critical'))) {
    verdict = 'PRODUCTION_PILOT';
  } else if (verdict !== 'ROLLBACK_REQUIRED') {
    verdict = 'RELEASE_BLOCKED';
  }

  const report = [
    '# Investment2 RC1 Release Verdict',
    '',
    `**Verdict:** ${verdict}`,
    `**Captured:** ${new Date().toISOString()}`,
    `**OMS mode:** ${cfg.omsEntryMode}`,
    `**Legacy mode:** ${cfg.legacyEntryMode}`,
    `**Critical:** ${critical}  **Major:** ${major}`,
    '',
    '## Reasons',
    ...(reasons.length ? reasons.map((r) => `- ${r}`) : ['- None']),
    '',
    '## Missing for LIVE',
    ...missingLive.map((f) => `- ${f}`),
    '',
  ].join('\n');

  fs.mkdirSync(RELEASE, { recursive: true });
  fs.writeFileSync(path.join(RELEASE, 'Investment2_RC1_Release_Verdict.md'), report);
  console.log(report);
  process.exit(verdict === 'RELEASE_BLOCKED' || verdict === 'ROLLBACK_REQUIRED' ? 1 : 0);
}

main();
