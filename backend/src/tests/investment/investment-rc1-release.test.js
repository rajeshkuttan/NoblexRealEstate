'use strict';

const {
  getInvestmentV2ReleaseConfig,
  isOmsWriteAllowed,
  isOmsPilotOnly,
  isLegacyWriteAllowed,
  isLegacyReadOnly,
  publicReleaseStatus,
} = require('../../config/investmentV2ReleaseConfig');
const {
  buildFingerprint,
  originsCoexist,
  assertNoDuplicate,
} = require('../../services/investment/migration/duplicateFingerprint.service');
const { classifyDelta } = require('../../services/investment/migration/rc1Reconcile.service');
const { requireLegacyWrite, requireOmsWrite } = require('../../middleware/investmentV2ReleaseGuard');

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
  return res;
}

describe('Investment2 RC1 release config', () => {
  const prev = { ...process.env };
  afterEach(() => {
    process.env = { ...prev };
  });

  test('defaults enable V2 with pilot OMS and legacy enabled', () => {
    delete process.env.INVESTMENT_V2_OMS_ENTRY_MODE;
    delete process.env.INVESTMENT_V2_LEGACY_ENTRY_MODE;
    const cfg = getInvestmentV2ReleaseConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.omsEntryMode).toBe('pilot');
    expect(cfg.legacyEntryMode).toBe('enabled');
    expect(isOmsWriteAllowed()).toBe(true);
    expect(isOmsPilotOnly()).toBe(true);
    expect(isLegacyWriteAllowed()).toBe(true);
    expect(isLegacyReadOnly()).toBe(false);
  });

  test('oms disabled blocks writes', () => {
    process.env.INVESTMENT_V2_OMS_ENTRY_MODE = 'disabled';
    expect(isOmsWriteAllowed()).toBe(false);
  });

  test('legacy read_only', () => {
    process.env.INVESTMENT_V2_LEGACY_ENTRY_MODE = 'read_only';
    expect(isLegacyReadOnly()).toBe(true);
    expect(isLegacyWriteAllowed()).toBe(false);
  });

  test('legacy disabled', () => {
    process.env.INVESTMENT_V2_LEGACY_ENTRY_MODE = 'disabled';
    expect(isLegacyReadOnly()).toBe(true);
  });

  test('production oms mode', () => {
    process.env.INVESTMENT_V2_OMS_ENTRY_MODE = 'production';
    expect(isOmsPilotOnly()).toBe(false);
    expect(isOmsWriteAllowed()).toBe(true);
  });

  test('invalid enum falls back', () => {
    process.env.INVESTMENT_V2_OMS_ENTRY_MODE = 'weird';
    expect(getInvestmentV2ReleaseConfig().omsEntryMode).toBe('pilot');
  });

  test('tolerances parse', () => {
    process.env.INVESTMENT_V2_AMOUNT_TOLERANCE = '0.05';
    process.env.INVESTMENT_V2_RELEASE_MAX_UNRESOLVED_MAJOR = '2';
    const cfg = getInvestmentV2ReleaseConfig();
    expect(cfg.amountTolerance).toBe(0.05);
    expect(cfg.maxUnresolvedMajor).toBe(2);
  });

  test('market and sanctions modes disclosed', () => {
    process.env.INVESTMENT_V2_MARKET_DATA_MODE = 'manual_import';
    process.env.INVESTMENT_V2_SANCTIONS_MODE = 'provider_reference';
    const s = publicReleaseStatus();
    expect(s.marketDataMode).toBe('manual_import');
    expect(s.sanctionsMode).toBe('provider_reference');
  });

  test('hide test data default true', () => {
    expect(getInvestmentV2ReleaseConfig().hideTestData).toBe(true);
  });

  test('period reopen default false', () => {
    expect(getInvestmentV2ReleaseConfig().allowPeriodReopen).toBe(false);
  });
});

describe('Investment2 RC1 middleware legacy write', () => {
  const prev = { ...process.env };
  afterEach(() => {
    process.env = { ...prev };
  });

  test('allows when enabled', (done) => {
    process.env.INVESTMENT_V2_LEGACY_ENTRY_MODE = 'enabled';
    requireLegacyWrite({}, mockRes(), () => done());
  });

  test('restricted requires reason', () => {
    process.env.INVESTMENT_V2_LEGACY_ENTRY_MODE = 'restricted';
    const res = mockRes();
    requireLegacyWrite({ body: {}, headers: {} }, res, () => {});
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('LEGACY_REASON_REQUIRED');
  });

  test('restricted with reason proceeds', (done) => {
    process.env.INVESTMENT_V2_LEGACY_ENTRY_MODE = 'restricted';
    requireLegacyWrite({ body: { legacyEntryReason: 'broker downtime' }, headers: {} }, mockRes(), () => done());
  });

  test('read_only blocks without emergency', () => {
    process.env.INVESTMENT_V2_LEGACY_ENTRY_MODE = 'read_only';
    const res = mockRes();
    requireLegacyWrite({ body: {}, headers: {}, userPermissions: [] }, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('LEGACY_READ_ONLY');
  });

  test('read_only allows emergency with permission+reason', (done) => {
    process.env.INVESTMENT_V2_LEGACY_ENTRY_MODE = 'read_only';
    requireLegacyWrite(
      {
        body: { emergencyReason: 'urgent correction' },
        headers: {},
        userPermissions: ['module:investment:legacy_emergency_entry'],
      },
      mockRes(),
      () => done()
    );
  });
});

describe('Investment2 RC1 middleware OMS write', () => {
  const prev = { ...process.env };
  afterEach(() => {
    process.env = { ...prev };
  });

  test('disabled oms', async () => {
    process.env.INVESTMENT_V2_OMS_ENTRY_MODE = 'disabled';
    const res = mockRes();
    await requireOmsWrite({ headers: {} }, res, () => {});
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('OMS_DISABLED');
  });

  test('v2 disabled', async () => {
    process.env.INVESTMENT_V2_ENABLED = 'false';
    const res = mockRes();
    await requireOmsWrite({ headers: {} }, res, () => {});
    expect(res.statusCode).toBe(403);
  });

  test('production mode skips pilot table', async () => {
    process.env.INVESTMENT_V2_OMS_ENTRY_MODE = 'production';
    await new Promise((resolve) => {
      requireOmsWrite({ headers: {}, companyId: 1, user: { id: 1 } }, mockRes(), resolve);
    });
  });
});

describe('Investment2 RC1 duplicate fingerprint', () => {
  test('buildFingerprint stable', () => {
    const a = buildFingerprint({
      companyId: 1,
      instrumentOrAssetKey: 'A:9',
      transactionType: 'BUY',
      tradeDate: '2026-01-01',
      quantity: 10,
      amount: 100,
      brokerReference: 'BR1',
    });
    const b = buildFingerprint({
      companyId: 1,
      instrumentOrAssetKey: 'A:9',
      transactionType: 'buy',
      tradeDate: '2026-01-01',
      quantity: 10,
      amount: 100,
      brokerReference: 'br1',
    });
    expect(a.hash).toBe(b.hash);
    expect(a.hash.length).toBeGreaterThan(10);
  });

  test('different qty different fingerprint', () => {
    const a = buildFingerprint({
      companyId: 1,
      instrumentOrAssetKey: 'A:1',
      transactionType: 'BUY',
      tradeDate: '2026-01-01',
      quantity: 1,
      amount: 10,
    });
    const b = buildFingerprint({
      companyId: 1,
      instrumentOrAssetKey: 'A:1',
      transactionType: 'BUY',
      tradeDate: '2026-01-01',
      quantity: 2,
      amount: 10,
    });
    expect(a.hash).not.toBe(b.hash);
  });

  test('OMS and LEGACY coexist', () => {
    expect(originsCoexist('OMS', 'LEGACY')).toBe(true);
    expect(originsCoexist('LEGACY', 'LEGACY')).toBe(false);
    expect(originsCoexist('OMS', 'OMS')).toBe(false);
  });

  test('assertNoDuplicate no-op when no model', async () => {
    await expect(
      assertNoDuplicate({}, {
        companyId: 1,
        instrumentOrAssetKey: 1,
        transactionType: 'BUY',
        tradeDate: '2026-01-01',
        quantity: 1,
        amount: 1,
        transactionOrigin: 'LEGACY',
      })
    ).resolves.toBeNull();
  });

  test('assertNoDuplicate throws on same-origin match', async () => {
    const models = {
      InvestmentTransaction: {
        findAll: async () => [
          {
            id: 99,
            transactionOrigin: 'LEGACY',
            quantity: 1,
            netAmount: 1,
            brokerReference: 'X',
            externalReference: null,
          },
        ],
      },
    };
    await expect(
      assertNoDuplicate(models, {
        companyId: 1,
        instrumentOrAssetKey: 1,
        transactionType: 'BUY',
        tradeDate: '2026-01-01',
        quantity: 1,
        amount: 1,
        brokerReference: 'X',
        transactionOrigin: 'LEGACY',
      })
    ).rejects.toMatchObject({ code: 'DUPLICATE_INVESTMENT_ENTRY' });
  });

  test('assertNoDuplicate ignores OMS vs LEGACY', async () => {
    const models = {
      InvestmentTransaction: {
        findAll: async () => [
          {
            id: 99,
            transactionOrigin: 'OMS',
            quantity: 1,
            netAmount: 1,
            brokerReference: 'X',
            externalReference: null,
          },
        ],
      },
    };
    await expect(
      assertNoDuplicate(models, {
        companyId: 1,
        instrumentOrAssetKey: 1,
        transactionType: 'BUY',
        tradeDate: '2026-01-01',
        quantity: 1,
        amount: 1,
        brokerReference: 'X',
        transactionOrigin: 'LEGACY',
      })
    ).resolves.toBeNull();
  });
});

describe('Investment2 RC1 reconcile classifyDelta', () => {
  test('exact match', () => {
    expect(classifyDelta(10, 10, 0.01)).toBe('MATCHED');
  });
  test('within tolerance', () => {
    expect(classifyDelta(10, 10.005, 0.01)).toBe('MATCHED_WITHIN_TOLERANCE');
  });
  test('exception', () => {
    expect(classifyDelta(10, 11, 0.01)).toBe('EXCEPTION');
  });
});

describe('Investment2 RC1 migrate helpers', () => {
  const migrate = require('../../services/investment/migration/rc1Migrate.service');

  test('exports migrateCompany', () => {
    expect(typeof migrate.migrateCompany).toBe('function');
  });
  test('exports migrateAllCompanies', () => {
    expect(typeof migrate.migrateAllCompanies).toBe('function');
  });
  test('exports ensureLegacyPortfolio', () => {
    expect(typeof migrate.ensureLegacyPortfolio).toBe('function');
  });
  test('exports rollbackBatch', () => {
    expect(typeof migrate.rollbackBatch).toBe('function');
  });
});

describe('Investment2 RC1 permissions include emergency', () => {
  const { INVESTMENT_EXTRA_PERMISSIONS, PERMISSION_DEFINITIONS } = require('../../config/permissions');
  test('legacy_emergency_entry defined', () => {
    expect(INVESTMENT_EXTRA_PERMISSIONS.some((p) => p.code === 'module:investment:legacy_emergency_entry')).toBe(true);
  });
  test('included in all definitions', () => {
    expect(PERMISSION_DEFINITIONS.some((p) => p.code === 'module:investment:legacy_emergency_entry')).toBe(true);
  });
});

describe('Investment2 RC1 models registered', () => {
  const models = require('../../models');
  test('MigrationBatch', () => expect(models.InvestmentMigrationBatch).toBeTruthy());
  test('MigrationItem', () => expect(models.InvestmentMigrationItem).toBeTruthy());
  test('MigrationException', () => expect(models.InvestmentMigrationException).toBeTruthy());
  test('OmsPilotUser', () => expect(models.InvestmentOmsPilotUser).toBeTruthy());
  test('Transaction has transactionOrigin', () => {
    expect(models.InvestmentTransaction.rawAttributes.transactionOrigin).toBeTruthy();
  });
  test('Lot has lotOrigin', () => {
    expect(models.InvestmentPositionLot.rawAttributes.lotOrigin).toBeTruthy();
  });
});

describe('Investment2 RC1 migrate confirm env', () => {
  test('migrate script requires CONFIRM', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../../scripts/investment2Rc1Migrate.js'),
      'utf8'
    );
    expect(src).toContain('CONFIRM_LIVE_INVESTMENT2_MIGRATION');
  });
  test('rollback requires CONFIRM', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../../scripts/investment2Rc1RollbackMigration.js'),
      'utf8'
    );
    expect(src).toContain('CONFIRM_LIVE_INVESTMENT2_ROLLBACK');
  });
  test('seed guards production', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../../scripts/seedInvestment2Data.js'),
      'utf8'
    );
    expect(src).toContain('ALLOW_PRODUCTION_DEMO_SEED');
    expect(src).toContain('assertSeedAllowed');
  });
});

describe('Investment2 RC1 gate verdicts', () => {
  test('gate script defines four verdicts', () => {
    const fs = require('fs');
    const src = fs.readFileSync(
      require('path').join(__dirname, '../../scripts/investment2Rc1ReleaseGate.js'),
      'utf8'
    );
    expect(src).toContain('PRODUCTION_LIVE');
    expect(src).toContain('PRODUCTION_PILOT');
    expect(src).toContain('RELEASE_BLOCKED');
    expect(src).toContain('ROLLBACK_REQUIRED');
  });
});

describe('Investment2 RC1 routes wired', () => {
  const fs = require('fs');
  const routes = fs.readFileSync(
    require('path').join(__dirname, '../../routes/investmentModuleRoutes.js'),
    'utf8'
  );
  test('requireLegacyWrite on transactions', () => {
    expect(routes).toMatch(/requireLegacyWrite.*createTransaction|createTransaction.*requireLegacyWrite/);
  });
  test('requireOmsWrite on orders', () => {
    expect(routes).toContain('requireOmsWrite');
    expect(routes).toContain("'/v2/orders'");
  });
  test('release-status route', () => {
    expect(routes).toContain('/v2/release-status');
  });
  test('pilot users route', () => {
    expect(routes).toContain('/v2/oms-pilot-users');
  });
});

describe('Investment2 RC1 migration file', () => {
  test('rc1 migration exists', () => {
    const fs = require('fs');
    expect(
      fs.existsSync(
        require('path').join(__dirname, '../../migrations/20260714010000-investment-rc1-migration-batches.js')
      )
    ).toBe(true);
  });
});

describe('Investment2 RC1 package scripts', () => {
  const pkg = require('../../../package.json');
  const required = [
    'investment2:rc1:baseline',
    'investment2:rc1:migrate:dry-run',
    'investment2:rc1:migrate',
    'investment2:rc1:reconcile',
    'investment2:rc1:cutover-validate',
    'investment2:rc1:gate',
    'release:investment2:preflight',
    'release:investment2:postdeploy',
    'release:investment2:gate',
  ];
  for (const s of required) {
    test(`script ${s}`, () => {
      expect(pkg.scripts[s]).toBeTruthy();
    });
  }
});

describe('Investment2 RC1 cross-company isolation helpers', () => {
  test('fingerprint includes companyId', () => {
    const a = buildFingerprint({
      companyId: 1,
      instrumentOrAssetKey: 'A:1',
      transactionType: 'BUY',
      tradeDate: '2026-01-01',
      quantity: 1,
      amount: 1,
    });
    const b = buildFingerprint({
      companyId: 2,
      instrumentOrAssetKey: 'A:1',
      transactionType: 'BUY',
      tradeDate: '2026-01-01',
      quantity: 1,
      amount: 1,
    });
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('Investment2 RC1 public status shape', () => {
  test('has writable flags', () => {
    const s = publicReleaseStatus();
    expect(s).toHaveProperty('legacyWritable');
    expect(s).toHaveProperty('omsWritable');
    expect(s).toHaveProperty('omsPilotOnly');
  });
});
