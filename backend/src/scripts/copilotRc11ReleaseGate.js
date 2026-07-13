'use strict';

/**
 * RC1.1 release gate — PRODUCTION_LIVE | PRODUCTION_PILOT | RELEASE_BLOCKED
 * INFRA_PASS means Redis/Qdrant/BullMQ/MySQL/LLM health — NOT Docker.
 * Prefer copilotRc12ReleaseGate.js for production commissioning.
 * Usage: node src/scripts/copilotRc11ReleaseGate.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { runEvaluationSuite } = require('../copilot/evaluation/evaluationRunner');
const { getReleaseStage } = require('../copilot/config/copilotConfig');

const RELEASE = path.join(__dirname, '../../../Tasks/Release');
const SIGNOFF_RC11 = path.join(RELEASE, 'RC1.1_UAT_Signoff.md');
const SIGNOFF_RC1 = path.join(__dirname, '../../../Tasks/Copilot_UAT_Signoff.md');
const VERDICT_OUT = path.join(RELEASE, 'RC1.1_Release_Verdict.md');
const STATUS = path.join(__dirname, '../../../Tasks/Copilot_Production_Status.md');

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function hasPass(file, pattern = /\*\*Overall:\*\*\s*PASS|\*\*INFRA_PASS:\*\*\s*YES/i) {
  const t = read(path.join(RELEASE, file));
  return t && pattern.test(t);
}

function parseSignoffs(text) {
  const roles = ['Leasing', 'Finance', 'Treasury', 'Management'];
  const done = {};
  for (const role of roles) {
    const re = new RegExp(
      `\\|\\s*${role}\\s*\\|\\s*([^|]+)\\s*\\|\\s*([^|]+)\\s*\\|\\s*([^|]+)\\s*\\|`,
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
    done[role] =
      Boolean(name) &&
      Boolean(date) &&
      (result.includes('pass') || result.includes('approved') || result.includes('sign'));
  }
  return done;
}

function parsePilotScope(text) {
  // | Leasing | Yes | ... |
  const roles = ['Leasing', 'Finance', 'Treasury', 'Management'];
  const inPilot = [];
  for (const role of roles) {
    const re = new RegExp(`\\|\\s*${role}\\s*\\|\\s*(Yes|Y|true|pilot)\\s*\\|`, 'i');
    if (re.test(text)) inPilot.push(role);
  }
  return inPilot;
}

function main() {
  fs.mkdirSync(RELEASE, { recursive: true });
  const evalReport = runEvaluationSuite({});
  const evalOk = evalReport.passRate >= 95 && evalReport.total >= 150;

  const infraPass = hasPass('RC1.1_Infrastructure_Report.md', /\*\*INFRA_PASS:\*\*\s*YES/i);
  const healthPass = hasPass('RC1_Infrastructure_Health.md');
  const secPass = hasPass('RC1_Security_Validation.md');
  const perfPass = hasPass('RC1_Performance_Report.md');
  const corpusPass =
    hasPass('RC1_Corpus_Validation.md') || hasPass('RC1.1_Corpus_Validation.md');

  const signoffText = read(SIGNOFF_RC11) || read(SIGNOFF_RC1);
  const signoffs = parseSignoffs(signoffText);
  const signedCount = Object.values(signoffs).filter(Boolean).length;
  const allSigned = signedCount === 4;
  const pilotScope = parsePilotScope(signoffText);
  // Pilot: ≥1 real signature; if pilot-scope table has Yes rows, at least one signed role must be in scope
  const pilotEligible =
    signedCount >= 1 &&
    (pilotScope.length === 0 || pilotScope.some((role) => signoffs[role]));

  let verdict = 'RELEASE_BLOCKED';
  let recommendedStage = 'rc1';

  if (!infraPass || !secPass) {
    verdict = 'RELEASE_BLOCKED';
    recommendedStage = 'rc1';
  } else if (infraPass && secPass && perfPass && corpusPass && evalOk && allSigned) {
    verdict = 'PRODUCTION_LIVE';
    recommendedStage = 'live';
  } else if (infraPass && secPass && perfPass && evalOk && pilotEligible) {
    verdict = 'PRODUCTION_PILOT';
    recommendedStage = 'stage1';
  } else if (infraPass && secPass && perfPass && evalOk && signedCount === 0) {
    // Infra green but UAT unsigned → blocked for live/pilot until at least one signature or formal pilot scope
    verdict = 'RELEASE_BLOCKED';
    recommendedStage = 'rc1';
  } else {
    verdict = 'RELEASE_BLOCKED';
    recommendedStage = getReleaseStage();
  }

  // Special case: INFRA fail always blocked
  if (!infraPass) verdict = 'RELEASE_BLOCKED';

  const md = `# RC1.1 Release Verdict

Generated: ${new Date().toISOString()}
Current COPILOT_RELEASE_STAGE: ${getReleaseStage()}
Recommended stage: **${recommendedStage}**

| Gate | Status |
|------|--------|
| INFRA_PASS (RC1.1) | ${infraPass ? 'PASS' : 'FAIL'} |
| Health report (RC1) | ${healthPass ? 'PASS' : 'FAIL/N/A'} |
| Security | ${secPass ? 'PASS' : 'FAIL'} |
| Performance | ${perfPass ? 'PASS' : 'FAIL'} |
| Corpus | ${corpusPass ? 'PASS' : 'FAIL'} |
| Eval ≥95%/≥150 | ${evalOk ? 'PASS' : 'FAIL'} (${evalReport.passRate}% / ${evalReport.total}) |
| UAT Leasing | ${signoffs.Leasing ? 'SIGNED' : 'PENDING'} |
| UAT Finance | ${signoffs.Finance ? 'SIGNED' : 'PENDING'} |
| UAT Treasury | ${signoffs.Treasury ? 'SIGNED' : 'PENDING'} |
| UAT Management | ${signoffs.Management ? 'SIGNED' : 'PENDING'} |
| Pilot scope departments | ${pilotScope.length ? pilotScope.join(', ') : '(none listed)'} |

## Verdict

**${verdict}**

### Rules

1. **PRODUCTION_LIVE** — INFRA + Security + Perf + Corpus + all four UAT signatures.
2. **PRODUCTION_PILOT** — INFRA + Security + Perf + ≥1 UAT signature (and/or pilot scope table). Restrict RBAC to Stage 1 / listed departments; set \`COPILOT_RELEASE_STAGE=stage1\`.
3. **RELEASE_BLOCKED** — Critical infra/security failure, or no signed UAT for pilot/live.

Do **not** set \`COPILOT_RELEASE_STAGE=live\` unless verdict is PRODUCTION_LIVE.
`;

  fs.writeFileSync(VERDICT_OUT, md);

  const status = `# Copilot Production Status (RC1.1)

## Verdict: **${verdict}**

Updated: ${new Date().toISOString()}
Recommended \`COPILOT_RELEASE_STAGE\`: \`${recommendedStage}\`

| Area | Status |
|------|--------|
| INFRA_PASS | ${infraPass ? 'YES' : 'NO'} |
| Security / Perf / Corpus | ${secPass && perfPass && corpusPass ? 'PASS' : 'See gate'} |
| UAT signatures | ${signedCount}/4 |
| Release path | ${verdict} |

Evidence: \`Tasks/Release/RC1.1_Release_Verdict.md\`, \`RC1.1_Infrastructure_Report.md\`.

Pilot RBAC (if PRODUCTION_PILOT): grant \`module:copilot:use\` only to admin + approved Leasing/pilot roles per \`RC1.1_UAT_Signoff.md\` pilot scope.
`;
  fs.writeFileSync(STATUS, status);
  console.log(md);
  process.exit(verdict === 'RELEASE_BLOCKED' ? 2 : 0);
}

main();
