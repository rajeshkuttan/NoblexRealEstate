const fs = require('fs');
const path = require('path');
const { SystemIntegrityAudit } = require('../models');
const { testConnection } = require('../config/database');
const { runFullIntegrityAudit } = require('../services/dataIntegrityAudit.service');
const { runPermissionAudit } = require('../services/permissionAudit.service');
const { persistIntegrityRun, newRunId, getLatestRunSummary } = require('../services/systemIntegrityPersist.service');
const { getLastRunMeta } = require('../services/auditScheduler.service');
const { getUatScenarios } = require('../services/uatScenarioGenerator.service');

async function getPendingMigrationCount() {
  const migDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.js'));
  const { sequelize } = require('../models');
  const [meta] = await sequelize.query('SELECT name FROM SequelizeMeta');
  const recorded = new Set(meta.map((r) => r.name));
  return files.filter((f) => !recorded.has(f)).length;
}

exports.getSummary = async (req, res, next) => {
  try {
    let dbOk = false;
    try {
      dbOk = await testConnection();
    } catch {
      dbOk = false;
    }

    let pendingMigrations = null;
    try {
      pendingMigrations = await getPendingMigrationCount();
    } catch {
      pendingMigrations = null;
    }

    const lastRun = await getLatestRunSummary();
    const schedulerMeta = await getLastRunMeta();

    const cards = {
      crossCompany: lastRun?.byCategory?.['Cross Company References'] || 0,
      orphans: lastRun?.byCategory?.['Orphan Records'] || 0,
      numbering: lastRun?.byCategory?.['Numbering Conflicts'] || 0,
      missingCompanyIds: lastRun?.byCategory?.['Missing Company IDs'] || 0,
      periodViolations: lastRun?.byCategory?.['Financial Period Violations'] || 0,
      vatViolations: lastRun?.byCategory?.['VAT Period Violations'] || 0,
      permissionIssues: lastRun?.byCategory?.['Permission Issues'] || 0,
      total: lastRun?.totalViolations || 0,
    };

    res.json({
      success: true,
      data: {
        readiness: {
          database: dbOk,
          pendingMigrations,
          lastIntegrityScan: schedulerMeta?.completedAt || lastRun?.completedAt || null,
        },
        lastRun,
        cards,
        severity: lastRun?.bySeverity || { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.listAudits = async (req, res, next) => {
  try {
    const { runId, severity, auditType, page = 1, limit = 50 } = req.query;
    const where = {};
    if (runId) where.runId = runId;
    if (severity) where.severity = severity;
    if (auditType) where.auditType = auditType;

    const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const { rows, count } = await SystemIntegrityAudit.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit, 10),
      offset,
    });

    const AUDIT_CATEGORY_BY_TYPE = {
      PERMISSION_AUDIT_FAILURE: 'Permission Issues',
      CROSS_COMPANY_DATA_INTEGRITY_FAILURE: 'Cross Company References',
      MISSING_COMPANY_ID: 'Missing Company IDs',
      ORPHAN_RECORD: 'Orphan Records',
      NUMBERING_CONFLICT_FOUND: 'Numbering Conflicts',
      PERIOD_VIOLATION_FOUND: 'Financial Period Violations',
      VAT_PERIOD_VIOLATION: 'VAT Period Violations',
      INVALID_FINANCIAL_REFERENCE: 'Invalid Financial References',
      DUPLICATE_COMPANY_ASSIGNMENT: 'Duplicate Company Assignments',
      TEMPLATE_CONFLICT: 'Document Template Conflicts',
    };

    const serializeAuditRow = (row) => {
      const plain = row.toJSON ? row.toJSON() : row;
      let details = plain.detailsJson;
      if (typeof details === 'string') {
        try {
          details = JSON.parse(details);
        } catch {
          details = null;
        }
      }
      return {
        ...plain,
        detailsJson: details,
        category: details?.category || AUDIT_CATEGORY_BY_TYPE[plain.auditType] || plain.auditType,
      };
    };

    res.json({
      success: true,
      data: rows.map(serializeAuditRow),
      pagination: {
        total: count,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.runAudit = async (req, res, next) => {
  try {
    const summaryOnly = req.body.summaryOnly !== false;
    const runId = newRunId();

    const dataResult = await runFullIntegrityAudit({
      summaryOnly,
      maxRecordsPerFinding: summaryOnly ? 10 : 50,
      runId,
      persist: false,
    });
    const permFinding = await runPermissionAudit({
      maxRecords: summaryOnly ? 10 : 50,
    });
    const findings = [...dataResult.findings, permFinding];
    await persistIntegrityRun({ runId, findings, req });

    res.json({
      success: true,
      data: {
        runId,
        startedAt: dataResult.startedAt,
        finishedAt: new Date(),
        findings,
        summary: {
          total: findings.reduce((s, f) => s + f.count, 0),
          bySeverity: findings.reduce(
            (acc, f) => {
              acc[f.severity] = (acc[f.severity] || 0) + f.count;
              return acc;
            },
            { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
          ),
        },
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const { runId: queryRunId, format } = req.query;
    let runId = queryRunId;
    if (!runId) {
      const latest = await SystemIntegrityAudit.findOne({
        order: [['createdAt', 'DESC']],
        attributes: ['runId'],
      });
      runId = latest?.runId;
    }
    if (!runId) {
      return res.status(404).json({ success: false, message: 'No audit runs found' });
    }

    const rows = await SystemIntegrityAudit.findAll({
      where: { runId },
      order: [['severity', 'DESC'], ['recordCount', 'DESC']],
    });

    if (format === 'csv') {
      const lines = ['audit_type,severity,record_count,category'];
      for (const r of rows) {
        const cat = (r.detailsJson?.category || '').replace(/,/g, ';');
        lines.push(`${r.auditType},${r.severity},${r.recordCount},${cat}`);
      }
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="integrity-report-${runId}.csv"`);
      return res.send(lines.join('\n'));
    }

    res.json({
      success: true,
      data: {
        runId,
        generatedAt: new Date(),
        findings: rows.map((r) => ({
          auditType: r.auditType,
          severity: r.severity,
          recordCount: r.recordCount,
          category: r.detailsJson?.category,
          records: r.detailsJson?.records || [],
        })),
        uatScenarios: getUatScenarios(),
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.getUatScenarios = async (req, res, next) => {
  try {
    res.json({ success: true, data: getUatScenarios() });
  } catch (e) {
    next(e);
  }
};

exports.getReadiness = async (req, res, next) => {
  try {
    let dbOk = false;
    try {
      dbOk = await testConnection();
    } catch {
      dbOk = false;
    }
    let pendingMigrations = null;
    try {
      pendingMigrations = await getPendingMigrationCount();
    } catch {
      pendingMigrations = null;
    }
    const lastRun = await getLastRunMeta();
    const ready = dbOk && (pendingMigrations === 0 || pendingMigrations === null);

    res.json({
      success: true,
      data: {
        ready,
        database: dbOk,
        pendingMigrations,
        lastIntegrityScan: lastRun?.completedAt || null,
      },
    });
  } catch (e) {
    next(e);
  }
};
