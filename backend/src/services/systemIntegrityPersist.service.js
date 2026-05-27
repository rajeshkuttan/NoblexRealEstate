const { v4: uuidv4 } = require('uuid');
const { SystemIntegrityAudit } = require('../models');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('./companyAuditService');

async function persistIntegrityRun({ runId, findings, status = 'completed', req }) {
  const rows = findings.map((f) => ({
    runId,
    auditType: f.auditCode || f.category,
    severity: f.severity,
    recordCount: f.count,
    detailsJson: {
      category: f.category,
      auditCode: f.auditCode,
      records: f.records || [],
      summary: f.summary || null,
    },
    status,
  }));

  if (rows.length) {
    await SystemIntegrityAudit.bulkCreate(rows);
  }

  const critical = findings.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH');
  const total = findings.reduce((s, f) => s + (f.count || 0), 0);

  await logCompanyEvent({
    req,
    action: COMPANY_AUDIT_ACTIONS.SYSTEM_INTEGRITY_SCAN_RUN,
    entityId: 0,
    metadata: {
      run_id: runId,
      finding_count: findings.length,
      total_violations: total,
      critical_high: critical.length,
    },
  });

  if (critical.some((f) => f.count > 0)) {
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.SYSTEM_INTEGRITY_FAILURE,
      entityId: 0,
      metadata: {
        run_id: runId,
        categories: critical.filter((f) => f.count > 0).map((f) => f.category),
      },
    });
  }

  return rows.length;
}

function newRunId() {
  return uuidv4();
}

async function getLatestRunSummary() {
  const latest = await SystemIntegrityAudit.findOne({
    order: [['createdAt', 'DESC']],
    attributes: ['runId', 'createdAt'],
  });
  if (!latest) return null;

  const findings = await SystemIntegrityAudit.findAll({
    where: { runId: latest.runId },
    attributes: ['auditType', 'severity', 'recordCount', 'detailsJson', 'createdAt'],
  });

  const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const byCategory = {};
  let total = 0;
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + f.recordCount;
    total += f.recordCount;
    const cat = f.detailsJson?.category || f.auditType;
    byCategory[cat] = (byCategory[cat] || 0) + f.recordCount;
  }

  return {
    runId: latest.runId,
    completedAt: latest.createdAt,
    totalViolations: total,
    bySeverity,
    byCategory,
    findingCount: findings.length,
  };
}

module.exports = {
  persistIntegrityRun,
  newRunId,
  getLatestRunSummary,
};
