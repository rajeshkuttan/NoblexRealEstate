'use strict';

const path = require('path');
const { selectTools } = require('../tools/intentRouter');
const { checkUserMessage } = require('../guardrails/policyGuard');
const { detectTicketIntent } = require('../actions/helpdeskTicketAction');
const { detectCollectionNoticeIntent } = require('../actions/collectionNoticeAction');

function loadGoldenCases() {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(__dirname, 'goldenCases.json'));
}

function runCase(testCase, { userPermissions = [] } = {}) {
  const started = Date.now();
  const failures = [];
  let passed = true;

  const guard = checkUserMessage(testCase.question);
  if (testCase.expectBlocked) {
    if (guard.allowed) {
      passed = false;
      failures.push('Expected prompt to be blocked by guardrails');
    }
    return {
      caseId: testCase.id,
      passed,
      failures,
      latencyMs: Date.now() - started,
      details: { guard },
    };
  }

  if (!guard.allowed) {
    passed = false;
    failures.push(`Unexpectedly blocked: ${guard.code}`);
  }

  const missingPerms = (testCase.requiredPermissions || []).filter(
    (p) => !userPermissions.includes(p)
  );
  // Evaluation assumes caller has permissions; score permission_score as whether case declares them
  const permissionScore = missingPerms.length ? 0 : 1;

  if (testCase.expectedTool) {
    const tools = selectTools(testCase.question).map((t) => t.toolName);
    if (!tools.includes(testCase.expectedTool)) {
      passed = false;
      failures.push(`Expected tool ${testCase.expectedTool}, got [${tools.join(', ')}]`);
    }
  }

  if (testCase.expectedAction === 'createHelpdeskTicket') {
    if (!detectTicketIntent(testCase.question)) {
      passed = false;
      failures.push('Expected createHelpdeskTicket intent');
    }
  }
  if (testCase.expectedAction === 'prepareCollectionNotice') {
    if (!detectCollectionNoticeIntent(testCase.question)) {
      passed = false;
      failures.push('Expected prepareCollectionNotice intent');
    }
  }
  if (testCase.expectedAction === 'prepareFinancePostingDraft') {
    const { detectFinanceDraftIntent } = require('../actions/financePostingDraftAction');
    if (!detectFinanceDraftIntent(testCase.question)) {
      passed = false;
      failures.push('Expected prepareFinancePostingDraft intent');
    }
  }

  return {
    caseId: testCase.id,
    category: testCase.category,
    module: testCase.module,
    question: testCase.question,
    passed,
    failures,
    permissionScore,
    latencyMs: Date.now() - started,
  };
}

/**
 * Lightweight evaluation suite (intent/guardrails). Full LLM scoring deferred.
 */
function runEvaluationSuite({ userPermissions = null, category = null } = {}) {
  const cases = loadGoldenCases().filter((c) => !category || c.category === category);
  // Use union of all required permissions so routing tests focus on intent, not RBAC gaps
  const perms =
    userPermissions ||
    Array.from(new Set(cases.flatMap((c) => c.requiredPermissions || [])));

  const results = cases.map((c) => runCase(c, { userPermissions: perms }));
  const passed = results.filter((r) => r.passed).length;
  return {
    total: results.length,
    passed,
    failed: results.length - passed,
    passRate: results.length ? Number(((passed / results.length) * 100).toFixed(1)) : 0,
    results,
    mode: 'intent_guardrails',
    note: 'Phase-7 lightweight suite (EN+AR intent + guardrails). Full answer/source scoring comes later.',
  };
}

module.exports = {
  loadGoldenCases,
  runCase,
  runEvaluationSuite,
};
