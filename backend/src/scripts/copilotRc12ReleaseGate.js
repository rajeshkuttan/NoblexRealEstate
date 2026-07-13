'use strict';

/**
 * RC1.2 release gate — PRODUCTION_LIVE | PRODUCTION_PILOT | RELEASE_BLOCKED
 * Missing Docker never blocks. Usage: node src/scripts/copilotRc12ReleaseGate.js
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../config.env') });

const { runEvaluationSuite } = require('../copilot/evaluation/evaluationRunner');
const { getReleaseStage } = require('../copilot/config/copilotConfig');

const RELEASE = path.join(__dirname, '../../../Tasks/Release');
const SIGNOFF = path.join(RELEASE, 'RC1.2_UAT_Signoff.md');
const SIGNOFF_FALLBACK = path.join(RELEASE, 'RC1.1_UAT_Signoff.md');
const VERDICT_OUT = path.join(RELEASE, 'RC1.2_Release_Verdict.md');
const STATUS = path.join(__dirname, '../../../Tasks/Copilot_Production_Status.md');

function read(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function hasPass(file, pattern = /\*\*Overall:\*\*\s*PASS|\*\*INFRA_PASS:\*\*\s*YES/i) {
  const t = read(path.join(RELEASE, file));
  return Boolean(t && pattern.test(t));
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
  const roles = ['Leasing', 'Finance', 'Treasury', 'Management'];
  const inPilot = [];
  for (const role of roles) {
    const re = new RegExp(`\\|\\s*${role}\\s*\\|\\s*(Yes|Y|true|pilot)\\s*\\|`, 'i');
    if (re.test(text)) inPilot.push(role);
  }
  return inPilot;
}

function parsePilotAllowList(text) {
  // | user@example.com | Leasing | Yes |
  const lines = text.split('\n').filter((l) => /\|/.test(l) && /@/.test(l));
  return lines
    .map((l) => {
      const parts = l.split('|').map((p) => p.trim()).filter(Boolean);
      return parts[0];
    })
    .filter(Boolean);
}

function main() {
  fs.mkdirSync(RELEASE, { recursive: true });
  const evalReport = runEvaluationSuite({});
  const evalOk = evalReport.passRate >= 95 && evalReport.total >= 150;

  const infraPass = hasPass('RC1.2_Native_Infrastructure_Report.md', /\*\*INFRA_PASS:\*\*\s*YES/i);
  const secPass =
    hasPass('RC1.2_Security_Report.md') || hasPass('RC1_Security_Validation.md');
  const perfPass = hasPass('RC1_Performance_Report.md');
  const corpusPass =
    hasPass('RC1_Corpus_Validation.md') || hasPass('RC1.2_Corpus_Validation.md');

  const signoffText = read(SIGNOFF) || read(SIGNOFF_FALLBACK);
  const signoffs = parseSignoffs(signoffText);
  const signedCount = Object.values(signoffs).filter(Boolean).length;
  const allSigned = signedCount === 4;
  const pilotScope = parsePilotScope(signoffText);
  const allowList = parsePilotAllowList(signoffText);
  const pilotDeptsSigned =
    pilotScope.length > 0 && pilotScope.every((role) => signoffs[role]);
  const pilotEligible =
    infraPass &&
    secPass &&
    perfPass &&
    corpusPass &&
    evalOk &&
    pilotDeptsSigned &&
    allowList.length > 0;

  let verdict = 'RELEASE_BLOCKED';
  let recommendedStage = 'rc1';

  if (!infraPass || !secPass) {
    verdict = 'RELEASE_BLOCKED';
    recommendedStage = 'rc1';
  } else if (infraPass && secPass && perfPass && corpusPass && evalOk && allSigned) {
    verdict = 'PRODUCTION_LIVE';
    recommendedStage = 'live';
  } else if (pilotEligible) {
    verdict = 'PRODUCTION_PILOT';
    recommendedStage = 'stage1';
  } else {
    verdict = 'RELEASE_BLOCKED';
    recommendedStage = getReleaseStage() === 'live' ? 'rc1' : getReleaseStage();
  }

  const md = `# RC1.2 Release Verdict

Generated: ${new Date().toISOString()}
Current COPILOT_RELEASE_STAGE: ${getReleaseStage()}
Recommended stage: **${recommendedStage}**

| Gate | Status |
|------|--------|
| Native INFRA_PASS (RC1.2) | ${infraPass ? 'PASS' : 'FAIL'} |
| Security | ${secPass ? 'PASS' : 'FAIL'} |
| Performance | ${perfPass ? 'PASS' : 'FAIL'} |
| Corpus | ${corpusPass ? 'PASS' : 'FAIL'} |
| Eval ≥95%/≥150 | ${evalOk ? 'PASS' : 'FAIL'} (${evalReport.passRate}% / ${evalReport.total}) |
| UAT Leasing | ${signoffs.Leasing ? 'SIGNED' : 'PENDING'} |
| UAT Finance | ${signoffs.Finance ? 'SIGNED' : 'PENDING'} |
| UAT Treasury | ${signoffs.Treasury ? 'SIGNED' : 'PENDING'} |
| UAT Management | ${signoffs.Management ? 'SIGNED' : 'PENDING'} |
| Pilot scope | ${pilotScope.length ? pilotScope.join(', ') : '(none)'} |
| Pilot allow-list users | ${allowList.length} |

## Verdict

**${verdict}**

### Rules

1. **PRODUCTION_LIVE** — Native INFRA + Security + Corpus + Perf + Eval + all four UAT signatures.
2. **PRODUCTION_PILOT** — Same tech gates + every pilot-scope department signed + pilot allow-list documented; \`COPILOT_RELEASE_STAGE=stage1\`.
3. **RELEASE_BLOCKED** — Redis unavailable / Redis &lt;5 / Qdrant down / BullMQ fail / security fail / unsigned required UAT.

**Missing Docker never causes RELEASE_BLOCKED.**

Do not set \`COPILOT_RELEASE_STAGE=live\` unless verdict is PRODUCTION_LIVE.
`;

  fs.writeFileSync(VERDICT_OUT, md);

  const status = `# Copilot Production Status (RC1.2)

## Verdict: **${verdict}**

Updated: ${new Date().toISOString()}
Recommended \`COPILOT_RELEASE_STAGE\`: \`${recommendedStage}\`

| Area | Status |
|------|--------|
| Native INFRA_PASS | ${infraPass ? 'YES' : 'NO'} |
| Docker required | **No** |
| Security / Perf / Corpus / Eval | ${secPass && perfPass && corpusPass && evalOk ? 'PASS' : 'See gate'} |
| UAT signatures | ${signedCount}/4 |
| Release path | ${verdict} |

Evidence: \`Tasks/Release/RC1.2_Release_Verdict.md\`, \`RC1.2_Native_Infrastructure_Report.md\`.

Pilot: allow-list users only; non-pilot blocked via RBAC + \`COPILOT_RELEASE_STAGE=stage1\`.
`;
  fs.writeFileSync(STATUS, status);
  console.log(md);
  process.exit(verdict === 'RELEASE_BLOCKED' ? 2 : 0);
}

main();
