const { sequelize } = require('../config/database');
const { newRunId, persistIntegrityRun } = require('./systemIntegrityPersist.service');

const COMPANY_SCOPED_TABLES = [
  'properties',
  'units',
  'tenants',
  'leases',
  'chart_of_accounts',
  'ledger_setups',
  'bank_accounts',
  'vendors',
  'budgets',
  'budget_categories',
  'journal_vouchers',
  'cheques',
  'payments',
  'invoices',
  'vendor_invoices',
  'security_deposits',
  'accounts_trans',
  'financial_transactions',
  'purchase_orders',
  'purchase_invoices',
  'bank_transactions',
];

const AUDIT_CODES = {
  CROSS_COMPANY: 'CROSS_COMPANY_DATA_INTEGRITY_FAILURE',
  MISSING_COMPANY: 'MISSING_COMPANY_ID',
  ORPHAN: 'ORPHAN_RECORD',
  NUMBERING: 'NUMBERING_CONFLICT_FOUND',
  PERIOD: 'PERIOD_VIOLATION_FOUND',
  VAT: 'VAT_PERIOD_VIOLATION',
  FIN_REF: 'INVALID_FINANCIAL_REFERENCE',
  DUPLICATE_ASSIGN: 'DUPLICATE_COMPANY_ASSIGNMENT',
  TEMPLATE: 'TEMPLATE_CONFLICT',
};

function makeFinding({ category, severity, count, records = [], auditCode, summary = null }) {
  return { category, severity, count, records, auditCode, summary };
}

async function queryCount(sql, replacements = {}) {
  const [rows] = await sequelize.query(sql, { replacements });
  return Number(rows[0]?.cnt ?? rows[0]?.count ?? 0);
}

async function queryRows(sql, replacements = {}, limit = 50) {
  const [rows] = await sequelize.query(`${sql} LIMIT ${Number(limit)}`, { replacements });
  return rows;
}

async function findCrossCompanyReferences({ maxRecords = 50, companyId } = {}) {
  const checks = [
    {
      label: 'Unit → Property',
      countSql: `SELECT COUNT(*) AS cnt FROM units u
        INNER JOIN properties p ON p.id = u.property_id
        WHERE u.company_id != p.company_id`,
      sampleSql: `SELECT u.id AS unit_id, u.company_id AS unit_company, p.company_id AS property_company
        FROM units u INNER JOIN properties p ON p.id = u.property_id
        WHERE u.company_id != p.company_id`,
    },
    {
      label: 'Lease → Property',
      countSql: `SELECT COUNT(*) AS cnt FROM leases l
        INNER JOIN units u ON u.id = l.unit_id
        INNER JOIN properties p ON p.id = u.property_id
        WHERE l.company_id != p.company_id`,
      sampleSql: `SELECT l.id AS lease_id, l.company_id AS lease_company, p.company_id AS property_company
        FROM leases l
        INNER JOIN units u ON u.id = l.unit_id
        INNER JOIN properties p ON p.id = u.property_id
        WHERE l.company_id != p.company_id`,
    },
    {
      label: 'Lease → Tenant',
      countSql: `SELECT COUNT(*) AS cnt FROM leases l
        INNER JOIN tenants t ON t.id = l.tenant_id
        WHERE l.company_id != t.company_id`,
      sampleSql: `SELECT l.id AS lease_id, l.company_id AS lease_company, t.company_id AS tenant_company
        FROM leases l INNER JOIN tenants t ON t.id = l.tenant_id
        WHERE l.company_id != t.company_id`,
    },
    {
      label: 'Invoice → Lease',
      countSql: `SELECT COUNT(*) AS cnt FROM invoices i
        INNER JOIN leases l ON l.id = i.lease_id
        WHERE i.lease_id IS NOT NULL AND i.company_id != l.company_id`,
      sampleSql: `SELECT i.id AS invoice_id, i.company_id AS invoice_company, l.company_id AS lease_company
        FROM invoices i INNER JOIN leases l ON l.id = i.lease_id
        WHERE i.lease_id IS NOT NULL AND i.company_id != l.company_id`,
    },
    {
      label: 'Invoice → Tenant',
      countSql: `SELECT COUNT(*) AS cnt FROM invoices i
        INNER JOIN tenants t ON t.id = i.tenant_id
        WHERE i.company_id != t.company_id`,
      sampleSql: `SELECT i.id AS invoice_id, i.company_id AS invoice_company, t.company_id AS tenant_company
        FROM invoices i INNER JOIN tenants t ON t.id = i.tenant_id
        WHERE i.company_id != t.company_id`,
    },
    {
      label: 'Payment allocation → Payment',
      countSql: `SELECT COUNT(*) AS cnt FROM payment_invoice_allocations pia
        INNER JOIN payments p ON p.id = pia.payment_id
        WHERE pia.company_id != p.company_id`,
      sampleSql: `SELECT pia.id, pia.company_id AS alloc_company, p.company_id AS payment_company
        FROM payment_invoice_allocations pia
        INNER JOIN payments p ON p.id = pia.payment_id
        WHERE pia.company_id != p.company_id`,
    },
    {
      label: 'Vendor invoice → Vendor',
      countSql: `SELECT COUNT(*) AS cnt FROM vendor_invoices vi
        INNER JOIN vendors v ON v.id = vi.vendor_id
        WHERE vi.company_id != v.company_id`,
      sampleSql: `SELECT vi.id, vi.company_id AS vi_company, v.company_id AS vendor_company
        FROM vendor_invoices vi INNER JOIN vendors v ON v.id = vi.vendor_id
        WHERE vi.company_id != v.company_id`,
    },
    {
      label: 'JV detail → JV',
      countSql: `SELECT COUNT(*) AS cnt FROM journal_voucher_details jvd
        INNER JOIN journal_vouchers jv ON jv.id = jvd.jv_id
        WHERE jvd.company_id != jv.company_id`,
      sampleSql: `SELECT jvd.id, jvd.company_id AS detail_company, jv.company_id AS jv_company
        FROM journal_voucher_details jvd
        INNER JOIN journal_vouchers jv ON jv.id = jvd.jv_id
        WHERE jvd.company_id != jv.company_id`,
    },
  ];

  let total = 0;
  const records = [];
  for (const c of checks) {
    let countSql = c.countSql;
    let sampleSql = c.sampleSql;
    const repl = {};
    if (companyId) {
      countSql += ` AND (u.company_id = :cid OR l.company_id = :cid OR i.company_id = :cid OR pia.company_id = :cid OR vi.company_id = :cid OR jvd.company_id = :cid)`.replace(
        /u\.|l\.|i\.|pia\.|vi\.|jvd\./g,
        (m) => m
      );
      repl.cid = companyId;
    }
    const cnt = await queryCount(countSql, repl);
    if (cnt > 0) {
      total += cnt;
      if (records.length < maxRecords) {
        const sample = await queryRows(sampleSql, repl, maxRecords - records.length);
        records.push(...sample.map((r) => ({ ...r, check: c.label })));
      }
    }
  }

  return makeFinding({
    category: 'Cross Company References',
    severity: total > 0 ? 'CRITICAL' : 'LOW',
    count: total,
    records: records.slice(0, maxRecords),
    auditCode: AUDIT_CODES.CROSS_COMPANY,
  });
}

async function findMissingCompanyIds({ maxRecords = 50 } = {}) {
  let total = 0;
  const records = [];
  for (const table of COMPANY_SCOPED_TABLES) {
    const cnt = await queryCount(
      `SELECT COUNT(*) AS cnt FROM \`${table}\` WHERE company_id IS NULL`
    ).catch(() => 0);
    if (cnt > 0) {
      total += cnt;
      if (records.length < maxRecords) {
        const rows = await queryRows(
          `SELECT id, '${table}' AS table_name FROM \`${table}\` WHERE company_id IS NULL`,
          {},
          maxRecords - records.length
        ).catch(() => []);
        records.push(...rows);
      }
    }
  }
  return makeFinding({
    category: 'Missing Company IDs',
    severity: total > 0 ? 'CRITICAL' : 'LOW',
    count: total,
    records: records.slice(0, maxRecords),
    auditCode: AUDIT_CODES.MISSING_COMPANY,
  });
}

async function findOrphanedRecords({ maxRecords = 50 } = {}) {
  const checks = [
    {
      label: 'Invoice without tenant',
      countSql: `SELECT COUNT(*) AS cnt FROM invoices i
        LEFT JOIN tenants t ON t.id = i.tenant_id WHERE t.id IS NULL`,
      sampleSql: `SELECT i.id AS invoice_id FROM invoices i
        LEFT JOIN tenants t ON t.id = i.tenant_id WHERE t.id IS NULL`,
    },
    {
      label: 'Lease without unit',
      countSql: `SELECT COUNT(*) AS cnt FROM leases l
        LEFT JOIN units u ON u.id = l.unit_id WHERE u.id IS NULL`,
      sampleSql: `SELECT l.id AS lease_id FROM leases l
        LEFT JOIN units u ON u.id = l.unit_id WHERE u.id IS NULL`,
    },
    {
      label: 'Payment allocation without invoice',
      countSql: `SELECT COUNT(*) AS cnt FROM payment_invoice_allocations pia
        LEFT JOIN invoices i ON i.id = pia.invoice_id WHERE i.id IS NULL`,
      sampleSql: `SELECT pia.id FROM payment_invoice_allocations pia
        LEFT JOIN invoices i ON i.id = pia.invoice_id WHERE i.id IS NULL`,
    },
    {
      label: 'PDC with bank_account_id but missing bank',
      countSql: `SELECT COUNT(*) AS cnt FROM cheques c
        LEFT JOIN bank_accounts b ON b.id = c.bank_account_id
        WHERE c.bank_account_id IS NOT NULL AND b.id IS NULL`,
      sampleSql: `SELECT c.id AS cheque_id FROM cheques c
        LEFT JOIN bank_accounts b ON b.id = c.bank_account_id
        WHERE c.bank_account_id IS NOT NULL AND b.id IS NULL`,
    },
  ];

  let total = 0;
  const records = [];
  for (const c of checks) {
    const cnt = await queryCount(c.countSql);
    if (cnt > 0) {
      total += cnt;
      if (records.length < maxRecords) {
        const sample = await queryRows(c.sampleSql, {}, maxRecords - records.length);
        records.push(...sample.map((r) => ({ ...r, check: c.label })));
      }
    }
  }

  return makeFinding({
    category: 'Orphan Records',
    severity: total > 0 ? 'HIGH' : 'LOW',
    count: total,
    records: records.slice(0, maxRecords),
    auditCode: AUDIT_CODES.ORPHAN,
  });
}

async function findNumberConflicts({ maxRecords = 50 } = {}) {
  const dupChecks = [
    { table: 'invoices', col: 'invoice_number', label: 'Invoice' },
    { table: 'payments', col: 'payment_number', label: 'Payment' },
    { table: 'journal_vouchers', col: 'jv_number', label: 'Journal Voucher' },
    { table: 'purchase_orders', col: 'po_number', label: 'Purchase Order' },
    { table: 'purchase_invoices', col: 'invoice_number', label: 'Purchase Invoice' },
    { table: 'vendor_invoices', col: 'invoice_number', label: 'Vendor Invoice' },
  ];

  let total = 0;
  const records = [];
  for (const { table, col, label } of dupChecks) {
    const cnt = await queryCount(
      `SELECT COUNT(*) AS cnt FROM (
        SELECT company_id, \`${col}\`, COUNT(*) AS c FROM \`${table}\`
        WHERE \`${col}\` IS NOT NULL AND \`${col}\` != ''
        GROUP BY company_id, \`${col}\` HAVING c > 1
      ) x`
    ).catch(() => 0);
    if (cnt > 0) {
      total += cnt;
      if (records.length < maxRecords) {
        const rows = await queryRows(
          `SELECT company_id, \`${col}\` AS doc_number, COUNT(*) AS duplicates
           FROM \`${table}\` WHERE \`${col}\` IS NOT NULL
           GROUP BY company_id, \`${col}\` HAVING COUNT(*) > 1`,
          {},
          maxRecords - records.length
        ).catch(() => []);
        records.push(...rows.map((r) => ({ ...r, documentType: label })));
      }
    }
  }

  return makeFinding({
    category: 'Numbering Conflicts',
    severity: total > 0 ? 'HIGH' : 'LOW',
    count: total,
    records: records.slice(0, maxRecords),
    auditCode: AUDIT_CODES.NUMBERING,
  });
}

async function findClosedPeriodViolations({ maxRecords = 50 } = {}) {
  const cnt = await queryCount(
    `SELECT COUNT(*) AS cnt FROM (
      SELECT i.id FROM invoices i
      INNER JOIN company_financial_periods fp ON fp.company_id = i.company_id
        AND i.invoice_date BETWEEN fp.start_date AND fp.end_date
      WHERE i.is_posted = 1 AND fp.status = 'HARD_CLOSED'
      UNION ALL
      SELECT p.id FROM payments p
      INNER JOIN company_financial_periods fp ON fp.company_id = p.company_id
        AND p.payment_date BETWEEN fp.start_date AND fp.end_date
      WHERE p.is_posted = 1 AND fp.status = 'HARD_CLOSED'
      UNION ALL
      SELECT jv.id FROM journal_vouchers jv
      INNER JOIN company_financial_periods fp ON fp.company_id = jv.company_id
        AND jv.date BETWEEN fp.start_date AND fp.end_date
      WHERE jv.status = 'posted' AND fp.status = 'HARD_CLOSED'
    ) v`
  ).catch(() => 0);

  let records = [];
  if (cnt > 0 && maxRecords > 0) {
    records = await queryRows(
      `SELECT 'invoice' AS source, i.id, i.invoice_date AS doc_date, fp.status AS period_status
       FROM invoices i
       INNER JOIN company_financial_periods fp ON fp.company_id = i.company_id
         AND i.invoice_date BETWEEN fp.start_date AND fp.end_date
       WHERE i.is_posted = 1 AND fp.status = 'HARD_CLOSED'`,
      {},
      maxRecords
    ).catch(() => []);
  }

  return makeFinding({
    category: 'Financial Period Violations',
    severity: cnt > 0 ? 'CRITICAL' : 'LOW',
    count: cnt,
    records,
    auditCode: AUDIT_CODES.PERIOD,
  });
}

async function findVatPeriodViolations({ maxRecords = 50 } = {}) {
  const cnt = await queryCount(
    `SELECT COUNT(*) AS cnt FROM (
      SELECT vi.id FROM vendor_invoices vi
      INNER JOIN company_vat_periods vp ON vp.company_id = vi.company_id
        AND vi.invoice_date BETWEEN vp.start_date AND vp.end_date
      WHERE vp.status = 'SUBMITTED' AND vi.updated_at > COALESCE(vp.submitted_at, vp.updated_at)
      UNION ALL
      SELECT i.id FROM invoices i
      INNER JOIN company_vat_periods vp ON vp.company_id = i.company_id
        AND i.invoice_date BETWEEN vp.start_date AND vp.end_date
      WHERE vp.status = 'SUBMITTED' AND i.updated_at > COALESCE(vp.submitted_at, vp.updated_at)
    ) v`
  ).catch(() => 0);

  let records = [];
  if (cnt > 0 && maxRecords > 0) {
    records = await queryRows(
      `SELECT 'vendor_invoice' AS source, vi.id, vi.invoice_date
       FROM vendor_invoices vi
       INNER JOIN company_vat_periods vp ON vp.company_id = vi.company_id
         AND vi.invoice_date BETWEEN vp.start_date AND vp.end_date
       WHERE vp.status = 'SUBMITTED' AND vi.updated_at > COALESCE(vp.submitted_at, vp.updated_at)`,
      {},
      maxRecords
    ).catch(() => []);
  }

  return makeFinding({
    category: 'VAT Period Violations',
    severity: cnt > 0 ? 'CRITICAL' : 'LOW',
    count: cnt,
    records,
    auditCode: AUDIT_CODES.VAT,
  });
}

async function findInvalidFinancialReferences({ maxRecords = 50 } = {}) {
  const cnt = await queryCount(
    `SELECT COUNT(*) AS cnt FROM accounts_trans at
      LEFT JOIN chart_of_accounts coa ON coa.id = at.account_id
      WHERE at.account_id IS NOT NULL AND (coa.id IS NULL OR at.company_id != coa.company_id)`
  ).catch(() => 0);

  let records = [];
  if (cnt > 0) {
    records = await queryRows(
      `SELECT at.id, at.company_id AS trans_company, coa.company_id AS account_company
       FROM accounts_trans at
       LEFT JOIN chart_of_accounts coa ON coa.id = at.account_id
       WHERE at.account_id IS NOT NULL AND (coa.id IS NULL OR at.company_id != coa.company_id)`,
      {},
      maxRecords
    ).catch(() => []);
  }

  return makeFinding({
    category: 'Invalid Financial References',
    severity: cnt > 0 ? 'HIGH' : 'LOW',
    count: cnt,
    records,
    auditCode: AUDIT_CODES.FIN_REF,
  });
}

async function findDuplicateAssignments({ maxRecords = 50 } = {}) {
  const dupPairs = await queryCount(
    `SELECT COUNT(*) AS cnt FROM (
      SELECT user_id, company_id, COUNT(*) AS c FROM company_users
      GROUP BY user_id, company_id HAVING c > 1
    ) x`
  ).catch(() => 0);

  const multiDefault = await queryCount(
    `SELECT COUNT(*) AS cnt FROM (
      SELECT user_id, COUNT(*) AS c FROM company_users WHERE is_default = 1
      GROUP BY user_id HAVING c > 1
    ) x`
  ).catch(() => 0);

  const total = dupPairs + multiDefault;
  const records = [];
  if (total > 0 && maxRecords > 0) {
    const rows = await queryRows(
      `SELECT user_id, company_id, COUNT(*) AS duplicates FROM company_users
       GROUP BY user_id, company_id HAVING COUNT(*) > 1`,
      {},
      maxRecords
    ).catch(() => []);
    records.push(...rows);
  }

  return makeFinding({
    category: 'Duplicate Company Assignments',
    severity: total > 0 ? 'MEDIUM' : 'LOW',
    count: total,
    records,
    auditCode: AUDIT_CODES.DUPLICATE_ASSIGN,
  });
}

async function findTemplateConflicts({ maxRecords = 50 } = {}) {
  const cnt = await queryCount(
    `SELECT COUNT(*) AS cnt FROM (
      SELECT company_id, document_type, COUNT(*) AS c FROM company_document_templates
      GROUP BY company_id, document_type HAVING c > 1
    ) x`
  ).catch(() => 0);

  let records = [];
  if (cnt > 0) {
    records = await queryRows(
      `SELECT company_id, document_type, COUNT(*) AS duplicates FROM company_document_templates
       GROUP BY company_id, document_type HAVING COUNT(*) > 1`,
      {},
      maxRecords
    ).catch(() => []);
  }

  return makeFinding({
    category: 'Document Template Conflicts',
    severity: cnt > 0 ? 'LOW' : 'LOW',
    count: cnt,
    records,
    auditCode: AUDIT_CODES.TEMPLATE,
  });
}

async function runFullIntegrityAudit(options = {}) {
  const {
    summaryOnly = true,
    maxRecordsPerFinding = summaryOnly ? 0 : 50,
    companyId = null,
    persist = false,
    req = null,
  } = options;

  const maxRecords = summaryOnly ? 0 : maxRecordsPerFinding;
  const startedAt = new Date();
  const runId = options.runId || newRunId();

  const runners = [
    () => findCrossCompanyReferences({ maxRecords, companyId }),
    () => findMissingCompanyIds({ maxRecords }),
    () => findOrphanedRecords({ maxRecords }),
    () => findNumberConflicts({ maxRecords }),
    () => findClosedPeriodViolations({ maxRecords }),
    () => findVatPeriodViolations({ maxRecords }),
    () => findInvalidFinancialReferences({ maxRecords }),
    () => findDuplicateAssignments({ maxRecords }),
    () => findTemplateConflicts({ maxRecords }),
  ];

  const findings = [];
  for (const run of runners) {
    findings.push(await run());
  }

  const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  let total = 0;
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + f.count;
    total += f.count;
  }

  const result = {
    runId,
    startedAt,
    finishedAt: new Date(),
    findings,
    summary: { total, bySeverity, findingCategories: findings.length },
  };

  if (persist) {
    await persistIntegrityRun({ runId, findings, req });
  }

  return result;
}

module.exports = {
  AUDIT_CODES,
  makeFinding,
  findCrossCompanyReferences,
  findMissingCompanyIds,
  findOrphanedRecords,
  findNumberConflicts,
  findClosedPeriodViolations,
  findVatPeriodViolations,
  findInvalidFinancialReferences,
  findDuplicateAssignments,
  findTemplateConflicts,
  runFullIntegrityAudit,
};
