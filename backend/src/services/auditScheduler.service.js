const cron = require('node-cron');
const { runFullIntegrityAudit } = require('./dataIntegrityAudit.service');
const { runPermissionAudit } = require('./permissionAudit.service');
const { persistIntegrityRun, newRunId, getLatestRunSummary } = require('./systemIntegrityPersist.service');

let lastRunMeta = null;
let isRunning = false;

async function executeScheduledAudit() {
  if (isRunning) {
    console.warn('integrity audit: skipped — previous run still in progress');
    return;
  }
  isRunning = true;
  const runId = newRunId();
  const startedAt = new Date();
  try {
    console.log(`integrity audit: starting scheduled run ${runId}`);
    const dataResult = await runFullIntegrityAudit({
      summaryOnly: true,
      maxRecordsPerFinding: 0,
      runId,
      persist: false,
    });
    const permFinding = await runPermissionAudit({ maxRecords: 0 });
    const findings = [...dataResult.findings, permFinding];
    await persistIntegrityRun({ runId, findings, req: null });
    lastRunMeta = {
      runId,
      startedAt,
      completedAt: new Date(),
      totalViolations: findings.reduce((s, f) => s + f.count, 0),
      status: 'completed',
    };
    console.log(`integrity audit: completed run ${runId}`);
  } catch (err) {
    console.error('integrity audit: scheduled run failed', err);
    lastRunMeta = {
      runId,
      startedAt,
      completedAt: new Date(),
      status: 'failed',
      error: err.message,
    };
  } finally {
    isRunning = false;
  }
}

function startIntegrityAuditScheduler() {
  cron.schedule('0 2 * * *', executeScheduledAudit);
  console.log('integrity audit scheduler registered (daily 02:00)');
}

function getSchedulerLastRunMeta() {
  return lastRunMeta;
}

async function getLastRunMeta() {
  if (lastRunMeta) return lastRunMeta;
  const dbSummary = await getLatestRunSummary();
  if (!dbSummary) return null;
  return {
    runId: dbSummary.runId,
    completedAt: dbSummary.completedAt,
    totalViolations: dbSummary.totalViolations,
    status: 'completed',
  };
}

module.exports = {
  startIntegrityAuditScheduler,
  executeScheduledAudit,
  getLastRunMeta,
  getSchedulerLastRunMeta,
};
