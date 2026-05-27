const fs = require('fs');
const path = require('path');

jest.mock('../services/companyAuditService', () => ({
  COMPANY_AUDIT_ACTIONS: {
    SYSTEM_INTEGRITY_SCAN_RUN: 'SYSTEM_INTEGRITY_SCAN_RUN',
    SYSTEM_INTEGRITY_FAILURE: 'SYSTEM_INTEGRITY_FAILURE',
    CROSS_COMPANY_DATA_INTEGRITY_FAILURE: 'CROSS_COMPANY_DATA_INTEGRITY_FAILURE',
    NUMBERING_CONFLICT_FOUND: 'NUMBERING_CONFLICT_FOUND',
    PERIOD_VIOLATION_FOUND: 'PERIOD_VIOLATION_FOUND',
    VAT_PERIOD_VIOLATION: 'VAT_PERIOD_VIOLATION',
    PERMISSION_AUDIT_FAILURE: 'PERMISSION_AUDIT_FAILURE',
  },
  logCompanyEvent: jest.fn().mockResolvedValue(undefined),
}));

const {
  makeFinding,
  AUDIT_CODES,
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
} = require('../services/dataIntegrityAudit.service');
const { runPermissionAudit } = require('../services/permissionAudit.service');
const { newRunId } = require('../services/systemIntegrityPersist.service');
const { getUatScenarios } = require('../services/uatScenarioGenerator.service');

describe('Phase 2E makeFinding', () => {
  test('builds standard finding shape', () => {
    const f = makeFinding({
      category: 'Test',
      severity: 'HIGH',
      count: 3,
      records: [{ id: 1 }],
      auditCode: 'TEST_CODE',
    });
    expect(f).toMatchObject({
      category: 'Test',
      severity: 'HIGH',
      count: 3,
      auditCode: 'TEST_CODE',
    });
    expect(f.records).toHaveLength(1);
  });
});

describe('Phase 2E audit codes', () => {
  test('defines expected codes', () => {
    expect(AUDIT_CODES.CROSS_COMPANY).toBe('CROSS_COMPANY_DATA_INTEGRITY_FAILURE');
    expect(AUDIT_CODES.NUMBERING).toBe('NUMBERING_CONFLICT_FOUND');
    expect(AUDIT_CODES.PERIOD).toBe('PERIOD_VIOLATION_FOUND');
    expect(AUDIT_CODES.VAT).toBe('VAT_PERIOD_VIOLATION');
  });
});

describe('Phase 2E data integrity queries', () => {
  const { sequelize } = require('../config/database');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('findMissingCompanyIds returns finding', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findMissingCompanyIds({ maxRecords: 0 });
    expect(f.category).toBe('Missing Company IDs');
    expect(f.severity).toBe('LOW');
  });

  test('findMissingCompanyIds critical when null rows', async () => {
    jest
      .spyOn(sequelize, 'query')
      .mockResolvedValueOnce([[{ cnt: 2 }]])
      .mockResolvedValue([[{ id: 1, table_name: 'invoices' }]]);
    const f = await findMissingCompanyIds({ maxRecords: 5 });
    expect(f.severity).toBe('CRITICAL');
    expect(f.count).toBeGreaterThan(0);
  });

  test('findCrossCompanyReferences aggregates checks', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findCrossCompanyReferences({ maxRecords: 0 });
    expect(f.auditCode).toBe(AUDIT_CODES.CROSS_COMPANY);
  });

  test('findOrphanedRecords returns orphan category', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findOrphanedRecords({ maxRecords: 0 });
    expect(f.category).toBe('Orphan Records');
  });

  test('findNumberConflicts checks duplicate numbers', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findNumberConflicts({ maxRecords: 0 });
    expect(f.auditCode).toBe(AUDIT_CODES.NUMBERING);
  });

  test('findClosedPeriodViolations uses period audit code', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findClosedPeriodViolations({ maxRecords: 0 });
    expect(f.auditCode).toBe(AUDIT_CODES.PERIOD);
  });

  test('findVatPeriodViolations uses VAT audit code', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findVatPeriodViolations({ maxRecords: 0 });
    expect(f.auditCode).toBe(AUDIT_CODES.VAT);
  });

  test('findInvalidFinancialReferences checks accounts_trans', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findInvalidFinancialReferences({ maxRecords: 0 });
    expect(f.category).toBe('Invalid Financial References');
  });

  test('findDuplicateAssignments checks company_users', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findDuplicateAssignments({ maxRecords: 0 });
    expect(f.auditCode).toBe('DUPLICATE_COMPANY_ASSIGNMENT');
  });

  test('findTemplateConflicts checks templates', async () => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
    const f = await findTemplateConflicts({ maxRecords: 0 });
    expect(f.category).toBe('Document Template Conflicts');
  });
});

describe('Phase 2E runFullIntegrityAudit', () => {
  const { sequelize } = require('../config/database');

  beforeEach(() => {
    jest.spyOn(sequelize, 'query').mockResolvedValue([[{ cnt: 0 }]]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns runId and findings array', async () => {
    const result = await runFullIntegrityAudit({ summaryOnly: true, runId: 'test-run' });
    expect(result.runId).toBe('test-run');
    expect(result.findings.length).toBeGreaterThanOrEqual(8);
    expect(result.summary).toHaveProperty('total');
  });

  test('summaryOnly uses zero max records', async () => {
    const result = await runFullIntegrityAudit({ summaryOnly: true });
    for (const f of result.findings) {
      expect(f.records).toEqual([]);
    }
  });
});

describe('Phase 2E permission audit', () => {
  const { User } = require('../models');

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('returns permission finding shape', async () => {
    jest.spyOn(User, 'findAll').mockResolvedValue([]);
    const { sequelize } = require('../config/database');
    jest.spyOn(sequelize, 'query').mockResolvedValue([[]]);
    const f = await runPermissionAudit({ maxRecords: 0 });
    expect(f.category).toBe('Permission Issues');
    expect(f.auditCode).toBe('PERMISSION_AUDIT_FAILURE');
    expect(f.summary).toEqual({
      noPermissions: 0,
      inactiveAssignments: 0,
      inactiveCompany: 0,
      financeGap: 0,
    });
  });

  test('does not false-flag finance_executive with subset permissions', async () => {
    const { SYSTEM_ROLE_PERMISSIONS } = require('../config/permissions');
    const rbac = require('../services/rbacService');
    const executivePerms = SYSTEM_ROLE_PERMISSIONS.finance_executive;

    jest.spyOn(User, 'findAll').mockResolvedValue([
      { id: 1, email: 'fe@test.com', role: 'finance_executive', isActive: true },
    ]);
    jest.spyOn(rbac, 'getUserEffectivePermissions').mockResolvedValue({
      permissions: executivePerms,
      roles: [{ key: 'finance_executive' }],
    });
    const { sequelize } = require('../config/database');
    jest.spyOn(sequelize, 'query').mockResolvedValue([[]]);

    const f = await runPermissionAudit({ maxRecords: 10 });
    expect(f.count).toBe(0);
    expect(f.summary.financeGap).toBe(0);
  });
});

describe('Phase 2E UAT scenarios', () => {
  test('returns scenario playbooks', () => {
    const scenarios = getUatScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(5);
    expect(scenarios[0]).toHaveProperty('steps');
    expect(scenarios[0]).toHaveProperty('expectedResult');
  });

  test('includes cache switch scenario', () => {
    const scenarios = getUatScenarios();
    expect(scenarios.some((s) => s.id === 'cache-company-switch')).toBe(true);
  });
});

describe('Phase 2E systemIntegrityPersist', () => {
  test('newRunId returns uuid string', () => {
    const id = newRunId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
  });
});

describe('Phase 2E static wiring', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

  test('migration creates system_integrity_audits', () => {
    const src = read('migrations/20260602100000-phase2e-system-integrity.js');
    expect(src).toMatch(/system_integrity_audits/);
    expect(src).toMatch(/run_id/);
  });

  test('audit service exports all finders', () => {
    const src = read('services/dataIntegrityAudit.service.js');
    expect(src).toMatch(/findCrossCompanyReferences/);
    expect(src).toMatch(/findVatPeriodViolations/);
    expect(src).toMatch(/runFullIntegrityAudit/);
  });

  test('app registers system-health routes', () => {
    const src = read('app.js');
    expect(src).toMatch(/systemHealthRoutes/);
    expect(src).toMatch(/\/api\/system-health/);
    expect(src).toMatch(/\/health\/ready/);
  });

  test('server starts integrity scheduler', () => {
    const src = read('server.js');
    expect(src).toMatch(/startIntegrityAuditScheduler/);
  });

  test('permissions include system_health module', () => {
    const src = read('config/permissions.js');
    expect(src).toMatch(/system_health/);
    expect(src).toMatch(/module:system_health:run/);
  });

  test('companyAuditService has integrity actions', () => {
    const src = read('services/companyAuditService.js');
    expect(src).toMatch(/SYSTEM_INTEGRITY_SCAN_RUN/);
    expect(src).toMatch(/PERMISSION_AUDIT_FAILURE/);
  });

  test('auditScheduler runs daily', () => {
    const src = read('services/auditScheduler.service.js');
    expect(src).toMatch(/0 2 \* \* \*/);
  });

  test('demo data script exists', () => {
    const p = path.join(__dirname, '..', '..', 'scripts', 'generate-phase2e-demo-data.js');
    expect(fs.existsSync(p)).toBe(true);
  });

  test('rbac sync script and service export exist', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'sync-system-role-permissions.js');
    expect(fs.existsSync(scriptPath)).toBe(true);
    const src = read('services/rbacService.js');
    expect(src).toMatch(/syncSystemRolePermissionsFromConfig/);
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')
    );
    expect(pkg.scripts['sync:rbac']).toBeDefined();
  });
});

describe('Phase 2E frontend static checks', () => {
  const readFrontend = (p) =>
    fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8');

  test('SystemHealthDashboard page exists', () => {
    const p = path.join(
      __dirname,
      '..',
      '..',
      '..',
      'src',
      'pages',
      'settings',
      'SystemHealthDashboard.tsx'
    );
    expect(fs.existsSync(p)).toBe(true);
  });

  test('api exports systemHealthAPI', () => {
    const src = readFrontend('src/services/api.ts');
    expect(src).toMatch(/systemHealthAPI/);
    expect(src).toMatch(/\/system-health\/run/);
  });

  test('permissions route for system-health', () => {
    const src = readFrontend('src/lib/permissions.ts');
    expect(src).toMatch(/\/settings\/system-health/);
  });

  test('SystemHealthDashboard shows audit categories', () => {
    const src = readFrontend('src/pages/settings/SystemHealthDashboard.tsx');
    expect(src).toMatch(/AUDIT_CATEGORY_LABELS/);
    expect(src).toMatch(/parseAuditDetails/);
  });

  test('CompanyContext invalidates system-health cache', () => {
    const src = readFrontend('src/contexts/CompanyContext.tsx');
    expect(src).toMatch(/\/system-health\//);
  });

  test('App route for system health', () => {
    const src = readFrontend('src/App.tsx');
    expect(src).toMatch(/SystemHealthDashboard/);
    expect(src).toMatch(/\/settings\/system-health/);
  });
});
