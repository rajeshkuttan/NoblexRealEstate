'use strict';

/**
 * RC1 release gate — Production Live only when all evidence + UAT sign-offs present.
 * Usage: node src/scripts/copilotRc1ReleaseGate.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { runEvaluationSuite } = require('../copilot/evaluation/evaluationRunner');
const { getReleaseStage } = require('../copilot/config/copilotConfig');

const RELEASE = path.join(__dirname, '../../../Tasks/Release');
const SIGNOFF = path.join(__dirname, '../../../Tasks/Copilot_UAT_Signoff.md');
const STATUS = path.join(__dirname, '../../../Tasks/Copilot_Production_Status.md');

const REQUIRED_REPORTS = [
  'RC1_Infrastructure_Health.md',
  'RC1_Security_Validation.md',
  'RC1_Performance_Report.md',
  'RC1_OCR_Quality.md',
  'RC1_Deployment_Checklist.md',
  'RC1_Rollback_Checklist.md',
  'RC1_Known_Limitations.md',
  'RC1_Production_Release_Notes.md',
];

function reportHasOverallPass(file) {
  const text = fs.readFileSync(path.join(RELEASE, file), 'utf8');
  return /\*\*Overall:\*\*\s*PASS/i.test(text) || /Overall:\s*PASS/i.test(text);
}

function parseSignoffs(text) {
  // Expect lines like: | Leasing | Name | Date | Approved |
  const roles = ['Leasing', 'Finance', 'Treasury', 'Management'];
  const done = {};
  for (const role of roles) {
    const re = new RegExp(`\\|\\s*${role}\\s*\\|\\s*([^|]+)\\s*\\|\\s*([^|]+)\\s*\\|\\s*([^|]+)\\s*\\|`, 'i');
    const m = text.match(re);
    if (!m) {
      done[role] = false;
      continue;
    }
    const name = m[1].trim();
    const date = m[2].trim();
    const result = m[3].trim().toLowerCase();
    done[role] = Boolean(name && date && (result.includes('pass') || result.includes('approved') || result.includes('sign')));
  }
  return done;
}

function main() {
  const missing = REQUIRED_REPORTS.filter((f) => !fs.existsSync(path.join(RELEASE, f)));
  const evalReport = runEvaluationSuite({});
  const evalOk = evalReport.passRate >= 95 && evalReport.total >= 150;

  const healthOk =
    fs.existsSync(path.join(RELEASE, 'RC1_Infrastructure_Health.md')) &&
    reportHasOverallPass('RC1_Infrastructure_Health.md');
  const secOk =
    fs.existsSync(path.join(RELEASE, 'RC1_Security_Validation.md')) &&
    reportHasOverallPass('RC1_Security_Validation.md');
  const perfOk =
    fs.existsSync(path.join(RELEASE, 'RC1_Performance_Report.md')) &&
    reportHasOverallPass('RC1_Performance_Report.md');

  let signoffs = { Leasing: false, Finance: false, Treasury: false, Management: false };
  if (fs.existsSync(SIGNOFF)) {
    signoffs = parseSignoffs(fs.readFileSync(SIGNOFF, 'utf8'));
  }
  const uatOk = Object.values(signoffs).every(Boolean);

  const technicalRc1 = missing.length === 0 && evalOk && secOk;
  // Infra/perf may fail without Docker — still allow RC1 commissioned pending infra if security+docs+eval ok
  const canLive = technicalRc1 && healthOk && perfOk && uatOk;

  const stage = getReleaseStage();
  const verdict = canLive
    ? 'PRODUCTION_LIVE'
    : technicalRc1
      ? 'RC1_COMMISSIONED_PENDING_UAT_OR_INFRA'
      : 'RC1_BLOCKED';

  const gateMd = `# RC1 Release Gate

Generated: ${new Date().toISOString()}
Current COPILOT_RELEASE_STAGE: ${stage}

| Gate | Status |
|------|--------|
| Required reports present | ${missing.length ? `MISSING: ${missing.join(', ')}` : 'PASS'} |
| Eval ≥95% / ≥150 | ${evalOk ? 'PASS' : 'FAIL'} (${evalReport.passRate}% / ${evalReport.total}) |
| Security report PASS | ${secOk ? 'PASS' : 'FAIL'} |
| Infrastructure report PASS | ${healthOk ? 'PASS' : 'FAIL'} |
| Performance report PASS | ${perfOk ? 'PASS' : 'FAIL'} |
| UAT Leasing | ${signoffs.Leasing ? 'PASS' : 'PENDING'} |
| UAT Finance | ${signoffs.Finance ? 'PASS' : 'PENDING'} |
| UAT Treasury | ${signoffs.Treasury ? 'PASS' : 'PENDING'} |
| UAT Management | ${signoffs.Management ? 'PASS' : 'PENDING'} |

**Verdict:** ${verdict}

Production Live requires: infra PASS + security PASS + performance PASS + all four UAT sign-offs.
If Docker/Redis/Qdrant are unavailable on the commissioning host, keep \`COPILOT_RELEASE_STAGE=rc1\` and re-run health/perf after infra is up.
`;

  fs.mkdirSync(RELEASE, { recursive: true });
  fs.writeFileSync(path.join(RELEASE, 'RC1_Release_Gate.md'), gateMd);

  const status = `# Copilot Production Status

## Release: ${verdict === 'PRODUCTION_LIVE' ? 'Production Live' : 'RC1 Commissioned — Production Live pending'}

Last gate: ${new Date().toISOString()}
Verdict: **${verdict}**

See \`Tasks/Release/RC1_Release_Gate.md\` for evidence checklist.

| Area | Status |
|------|--------|
| Technical acceptance (Phase 9) | Done |
| RC1 commissioning pack | ${missing.length ? 'Incomplete' : 'Present'} |
| Infra (Redis/Qdrant/hybrid/BullMQ) | ${healthOk ? 'PASS' : 'Pending / blocked on host Docker'} |
| Security validation | ${secOk ? 'PASS' : 'Pending'} |
| Performance validation | ${perfOk ? 'PASS' : 'Pending'} |
| UAT sign-offs (4) | ${uatOk ? 'Complete' : 'Pending human sign-off'} |

## Controlled rollout

Use \`COPILOT_RELEASE_STAGE\` = \`rc1|stage1|stage2|stage3|stage4|live\` plus RBAC grants per \`Tasks/Release/RC1_Production_Release_Notes.md\`.

Do **not** set \`COPILOT_RELEASE_STAGE=live\` until gate verdict is PRODUCTION_LIVE.
`;
  fs.writeFileSync(STATUS, status);
  console.log(gateMd);
  process.exit(canLive ? 0 : 2);
}

main();
