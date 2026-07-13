'use strict';

const {
  round2,
  round6,
  parseJsonField,
  asArray,
  computeExposures,
  maturityBucket,
  liquidityProfile,
  evaluateLimit,
  evaluateLimitsAgainstExposures,
  mandateAllowsAssetClass,
  isMandateEffective,
  investorAllocationAllowed,
  runPreTradeChecks,
  canOverrideBreach,
  assertOverrideReason,
  kycExpiringSoon,
  complianceCheckExpired,
  summarizeRiskDashboard,
  canTransitionMandate,
  MANDATE_TRANSITIONS,
  KYC_BLOCKING,
} = require('../../services/investment/risk/riskEngine.service');

describe('Phase 23 math helpers', () => {
  test('round2', () => expect(round2(1.005)).toBe(1.01));
  test('round6', () => expect(round6(0.1234567)).toBe(0.123457));
  test('parseJsonField object passthrough', () => {
    expect(parseJsonField({ a: 1 })).toEqual({ a: 1 });
  });
  test('parseJsonField string', () => {
    expect(parseJsonField('["EQUITY"]')).toEqual(['EQUITY']);
  });
  test('parseJsonField bad string', () => {
    expect(parseJsonField('{bad', [])).toEqual([]);
  });
  test('asArray', () => {
    expect(asArray('X')).toEqual(['X']);
    expect(asArray(['A', 'B'])).toEqual(['A', 'B']);
    expect(asArray(null)).toEqual([]);
  });
});

describe('Phase 23 computeExposures', () => {
  const holdings = [
    { marketValue: 600, assetClass: 'EQUITY', currencyCode: 'AED', countryCode: 'AE', sectorCode: 'BANK', issuerName: 'FAB', instrumentId: 1 },
    { marketValue: 400, assetClass: 'FIXED_INCOME', currencyCode: 'USD', countryCode: 'US', sectorCode: 'GOV', issuerName: 'UST', instrumentId: 2 },
  ];

  test('totals MV', () => {
    expect(computeExposures(holdings).totalMarketValue).toBe(1000);
  });
  test('asset class pct', () => {
    const e = computeExposures(holdings);
    expect(e.byAssetClass.find((x) => x.key === 'EQUITY').pct).toBe(60);
  });
  test('currency buckets', () => {
    const e = computeExposures(holdings);
    expect(e.byCurrency.find((x) => x.key === 'USD').pct).toBe(40);
  });
  test('issuer buckets', () => {
    expect(computeExposures(holdings).byIssuer[0].key).toBe('FAB');
  });
  test('empty holdings', () => {
    expect(computeExposures([]).totalMarketValue).toBe(0);
  });
});

describe('Phase 23 maturity / liquidity', () => {
  test('maturity buckets', () => {
    expect(maturityBucket(null)).toBe('OPEN_ENDED');
    expect(maturityBucket('2020-01-01', '2026-07-01')).toBe('MATURED');
    expect(maturityBucket('2026-07-15', '2026-07-01')).toBe('0_30');
    expect(maturityBucket('2026-09-01', '2026-07-01')).toBe('31_90');
    expect(maturityBucket('2027-01-01', '2026-07-01')).toBe('91_365');
    expect(maturityBucket('2028-07-01', '2026-07-01')).toBe('1Y_3Y');
    expect(maturityBucket('2035-01-01', '2026-07-01')).toBe('3Y_PLUS');
  });
  test('liquidityProfile by days', () => {
    const p = liquidityProfile([
      { marketValue: 50, liquidityDays: 3 },
      { marketValue: 50, liquidityDays: 60 },
    ]);
    expect(p.find((x) => x.key === 'T7').pct).toBe(50);
    expect(p.find((x) => x.key === 'ILLIQUID').pct).toBe(50);
  });
});

describe('Phase 23 evaluateLimit', () => {
  test('within', () => {
    const r = evaluateLimit(10, { thresholdWarning: 20, thresholdBreach: 25 });
    expect(r.breached).toBe(false);
  });
  test('warning', () => {
    expect(evaluateLimit(22, { thresholdWarning: 20, thresholdBreach: 25 }).severity).toBe('WARNING');
  });
  test('breach', () => {
    expect(evaluateLimit(26, { thresholdWarning: 20, thresholdBreach: 25 }).severity).toBe('BREACH');
  });
  test('critical at 1.25x', () => {
    expect(evaluateLimit(40, { thresholdWarning: 20, thresholdBreach: 25 }).severity).toBe('CRITICAL');
  });
});

describe('Phase 23 evaluateLimitsAgainstExposures', () => {
  const exposures = computeExposures([
    { marketValue: 800, issuerName: 'A', instrumentId: 1, currencyCode: 'AED', countryCode: 'AE', sectorCode: 'X', assetClass: 'EQUITY' },
    { marketValue: 200, issuerName: 'B', instrumentId: 2, currencyCode: 'USD', countryCode: 'US', sectorCode: 'Y', assetClass: 'FI' },
  ]);

  test('issuer limit breach', () => {
    const results = evaluateLimitsAgainstExposures(
      [{ id: 1, limitType: 'ISSUER', thresholdWarning: 50, thresholdBreach: 70, status: 'ACTIVE', measurementBasis: 'PERCENT_NAV' }],
      exposures
    );
    expect(results[0].breached).toBe(true);
  });

  test('skips inactive', () => {
    const results = evaluateLimitsAgainstExposures(
      [{ id: 2, limitType: 'CURRENCY', thresholdWarning: 1, thresholdBreach: 2, status: 'INACTIVE' }],
      exposures
    );
    expect(results).toHaveLength(0);
  });

  test('dimension filter', () => {
    const results = evaluateLimitsAgainstExposures(
      [{ id: 3, limitType: 'CURRENCY', dimension: 'USD', thresholdWarning: 10, thresholdBreach: 30, status: 'ACTIVE' }],
      exposures
    );
    expect(results[0].dimensionKey).toBe('USD');
    expect(results[0].actualValue).toBe(20);
  });
});

describe('Phase 23 mandate', () => {
  const mandate = {
    status: 'ACTIVE',
    effectiveFrom: '2026-01-01',
    effectiveTo: null,
    allowedAssetClassesJson: '["EQUITY","FIXED_INCOME"]',
    prohibitedAssetClassesJson: '["CRYPTO"]',
  };

  test('effective', () => {
    expect(isMandateEffective(mandate, '2026-07-01')).toBe(true);
  });
  test('not before from', () => {
    expect(isMandateEffective(mandate, '2025-01-01')).toBe(false);
  });
  test('allows equity', () => {
    expect(mandateAllowsAssetClass(mandate, 'EQUITY').ok).toBe(true);
  });
  test('blocks crypto', () => {
    expect(mandateAllowsAssetClass(mandate, 'CRYPTO').code).toBe('PROHIBITED_ASSET_CLASS');
  });
  test('blocks unknown class when allowlist set', () => {
    expect(mandateAllowsAssetClass(mandate, 'PRIVATE_EQUITY').ok).toBe(false);
  });
  test('transitions', () => {
    expect(canTransitionMandate('DRAFT', 'ACTIVE')).toBe(true);
    expect(canTransitionMandate('EXPIRED', 'ACTIVE')).toBe(false);
    expect(MANDATE_TRANSITIONS.ACTIVE).toContain('SUSPENDED');
  });
});

describe('Phase 23 investor allocation', () => {
  test('blocks pending KYC', () => {
    expect(investorAllocationAllowed({ status: 'ACTIVE', kycStatus: 'PENDING', complianceApprovalStatus: 'APPROVED' }).ok).toBe(false);
  });
  test('blocks expired KYC', () => {
    const r = investorAllocationAllowed({
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      complianceApprovalStatus: 'APPROVED',
      kycExpiryDate: '2020-01-01',
    });
    expect(r.code).toBe('KYC_EXPIRED');
  });
  test('blocks pending compliance approval', () => {
    expect(
      investorAllocationAllowed({ status: 'ACTIVE', kycStatus: 'APPROVED', complianceApprovalStatus: 'PENDING' }).code
    ).toBe('COMPLIANCE_APPROVAL');
  });
  test('allows clean investor', () => {
    expect(
      investorAllocationAllowed({
        status: 'ACTIVE',
        kycStatus: 'APPROVED',
        complianceApprovalStatus: 'APPROVED',
        kycExpiryDate: '2099-01-01',
      }).ok
    ).toBe(true);
  });
  test('KYC_BLOCKING set', () => {
    expect(KYC_BLOCKING.has('EXPIRED')).toBe(true);
  });
});

describe('Phase 23 pre-trade', () => {
  test('passes baseline', () => {
    const r = runPreTradeChecks({
      order: { side: 'BUY', quantity: 1, limitPrice: 10 },
      instrument: { assetClass: 'EQUITY', isRestricted: false },
    });
    expect(r.passed).toBe(true);
  });

  test('fails restricted', () => {
    const r = runPreTradeChecks({
      order: { side: 'BUY', quantity: 1, limitPrice: 10 },
      instrument: { isRestricted: true },
    });
    expect(r.failures.some((f) => f.code === 'RESTRICTED_INSTRUMENT')).toBe(true);
  });

  test('fails mandate prohibited', () => {
    const r = runPreTradeChecks({
      order: { side: 'BUY', quantity: 1, limitPrice: 10 },
      instrument: { assetClass: 'CRYPTO' },
      mandate: {
        status: 'ACTIVE',
        effectiveFrom: '2020-01-01',
        prohibitedAssetClassesJson: '["CRYPTO"]',
        allowedAssetClassesJson: '[]',
      },
    });
    expect(r.passed).toBe(false);
  });

  test('fails cash', () => {
    const r = runPreTradeChecks({
      order: { side: 'BUY', quantity: 100, limitPrice: 10 },
      instrument: {},
      cashAvailable: 50,
    });
    expect(r.failures.some((f) => f.code === 'AVAILABLE_CASH')).toBe(true);
  });

  test('fails counterparty', () => {
    const r = runPreTradeChecks({
      order: { brokerId: 9, side: 'BUY', quantity: 1, limitPrice: 1 },
      instrument: {},
      blockedCounterparties: [9],
    });
    expect(r.failures.some((f) => f.code === 'COUNTERPARTY')).toBe(true);
  });

  test('fails related party', () => {
    const r = runPreTradeChecks({
      order: { side: 'BUY', quantity: 1, limitPrice: 1 },
      instrument: {},
      relatedPartyNeedsApproval: true,
      relatedPartyApproved: false,
    });
    expect(r.failures.some((f) => f.code === 'RELATED_PARTY')).toBe(true);
  });

  test('requireMandate missing', () => {
    const r = runPreTradeChecks({
      order: {},
      instrument: {},
      requireMandate: true,
    });
    expect(r.failures.some((f) => f.code === 'MANDATE_MISSING')).toBe(true);
  });

  test('concentration projected breach', () => {
    const exposures = computeExposures([{ marketValue: 100, instrumentId: 1 }]);
    const r = runPreTradeChecks({
      order: { instrumentId: 1, quantity: 1000, limitPrice: 1, side: 'BUY' },
      instrument: { id: 1 },
      exposures,
      limits: [{ limitType: 'CONCENTRATION', thresholdWarning: 10, thresholdBreach: 20, status: 'ACTIVE' }],
    });
    expect(r.failures.some((f) => f.code === 'PORTFOLIO_LIMIT')).toBe(true);
  });
});

describe('Phase 23 breach override', () => {
  test('OPEN to EXCEPTION_APPROVED', () => {
    expect(canOverrideBreach('OPEN', 'EXCEPTION_APPROVED')).toBe(true);
  });
  test('CLOSED terminal', () => {
    expect(canOverrideBreach('CLOSED', 'OPEN')).toBe(false);
  });
  test('assertOverrideReason throws', () => {
    expect(() => assertOverrideReason('')).toThrow(/reason/i);
    try {
      assertOverrideReason(null);
    } catch (e) {
      expect(e.statusCode).toBe(400);
      expect(e.code).toBe('OVERRIDE_REASON_REQUIRED');
    }
  });
  test('assertOverrideReason ok', () => {
    expect(() => assertOverrideReason('Board waiver')).not.toThrow();
  });
});

describe('Phase 23 KYC helpers', () => {
  test('kycExpiringSoon', () => {
    expect(kycExpiringSoon({ kycExpiryDate: '2026-07-20' }, 30, '2026-07-01')).toBe(true);
    expect(kycExpiringSoon({ kycExpiryDate: '2027-01-01' }, 30, '2026-07-01')).toBe(false);
  });
  test('complianceCheckExpired', () => {
    expect(complianceCheckExpired({ expiryDate: '2020-01-01' }, '2026-07-01')).toBe(true);
    expect(complianceCheckExpired({ expiryDate: '2099-01-01' }, '2026-07-01')).toBe(false);
  });
});

describe('Phase 23 dashboard summary', () => {
  test('aggregates open breaches', () => {
    const s = summarizeRiskDashboard({
      exposures: computeExposures([{ marketValue: 100, assetClass: 'EQUITY', currencyCode: 'AED', countryCode: 'AE', sectorCode: 'X', issuerName: 'A', instrumentId: 1 }]),
      breaches: [{ status: 'OPEN' }, { status: 'CLOSED' }],
      kycExpiries: [{ investorId: 1 }],
      staleValuations: [{ holdingId: 1 }],
      liquidity: [{ key: 'T7', pct: 100 }],
    });
    expect(s.openBreaches).toHaveLength(1);
    expect(s.breachCount).toBe(2);
    expect(s.concentrations.assetClass.length).toBeGreaterThan(0);
    expect(s.kycExpiries).toHaveLength(1);
  });
});

describe('Phase 23 mandate edge cases', () => {
  test('null mandate allows all', () => {
    expect(mandateAllowsAssetClass(null, 'ANY').ok).toBe(true);
  });
  test('inactive mandate not effective', () => {
    expect(isMandateEffective({ status: 'DRAFT', effectiveFrom: '2020-01-01' })).toBe(false);
  });
  test('expired by effective_to', () => {
    expect(
      isMandateEffective({ status: 'ACTIVE', effectiveFrom: '2020-01-01', effectiveTo: '2025-12-31' }, '2026-01-01')
    ).toBe(false);
  });
  test('snake_case fields', () => {
    expect(
      mandateAllowsAssetClass(
        { allowed_asset_classes_json: '["EQ"]', prohibited_asset_classes_json: '[]' },
        'EQ'
      ).ok
    ).toBe(true);
  });
});

describe('Phase 23 pre-trade investor path', () => {
  test('investor KYC blocks pre-trade', () => {
    const r = runPreTradeChecks({
      order: { side: 'BUY', quantity: 1, limitPrice: 1 },
      instrument: {},
      investor: { status: 'ACTIVE', kycStatus: 'PENDING', complianceApprovalStatus: 'APPROVED' },
    });
    expect(r.failures.some((f) => f.code === 'KYC_BLOCKED')).toBe(true);
  });
  test('inactive mandate status fails', () => {
    const r = runPreTradeChecks({
      order: { orderDate: '2026-07-01' },
      instrument: { assetClass: 'EQUITY' },
      mandate: { status: 'SUSPENDED', effectiveFrom: '2020-01-01' },
    });
    expect(r.failures.some((f) => f.code === 'MANDATE_INACTIVE')).toBe(true);
  });
  test('sell skips cash insufficiency', () => {
    const r = runPreTradeChecks({
      order: { side: 'SELL', quantity: 100, limitPrice: 10 },
      instrument: {},
      cashAvailable: 0,
    });
    expect(r.failures.some((f) => f.code === 'AVAILABLE_CASH')).toBe(false);
  });
});

describe('Phase 23 limit evaluation matrix', () => {
  const exposures = {
    totalMarketValue: 1000,
    byIssuer: [{ key: 'X', value: 500, pct: 50 }],
    byCurrency: [{ key: 'AED', value: 1000, pct: 100 }],
    byCountry: [{ key: 'AE', value: 1000, pct: 100 }],
    bySector: [{ key: 'BANK', value: 400, pct: 40 }],
    byInstrument: [{ key: '1', value: 300, pct: 30 }],
    byAssetClass: [{ key: 'EQUITY', value: 1000, pct: 100 }],
  };

  test.each([
    ['ISSUER', 40, true],
    ['CURRENCY', 90, true],
    ['COUNTRY', 99, true],
    ['SECTOR', 50, false],
    ['CONCENTRATION', 25, true],
  ])('%s vs threshold %d', (limitType, breach, expectBreach) => {
    const results = evaluateLimitsAgainstExposures(
      [{ id: 1, limitType, thresholdWarning: breach - 5, thresholdBreach: breach, status: 'ACTIVE' }],
      exposures
    );
    expect(results[0].breached).toBe(expectBreach);
  });

  test('ABSOLUTE basis uses value', () => {
    const results = evaluateLimitsAgainstExposures(
      [{
        id: 9,
        limitType: 'ISSUER',
        measurementBasis: 'ABSOLUTE',
        thresholdWarning: 400,
        thresholdBreach: 450,
        status: 'ACTIVE',
      }],
      exposures
    );
    expect(results[0].actualValue).toBe(500);
    expect(results[0].breached).toBe(true);
  });
});

describe('Phase 23 breach workflow matrix', () => {
  test.each([
    ['OPEN', 'UNDER_REVIEW', true],
    ['UNDER_REVIEW', 'EXCEPTION_APPROVED', true],
    ['EXCEPTION_APPROVED', 'REMEDIATED', true],
    ['REMEDIATED', 'CLOSED', true],
    ['OPEN', 'CLOSED', true],
    ['CLOSED', 'EXCEPTION_APPROVED', false],
  ])('%s → %s = %s', (from, to, ok) => {
    expect(canOverrideBreach(from, to)).toBe(ok);
  });
});

describe('Phase 23 investor inactive', () => {
  test('inactive investor blocked', () => {
    expect(
      investorAllocationAllowed({ status: 'SUSPENDED', kycStatus: 'APPROVED', complianceApprovalStatus: 'APPROVED' }).code
    ).toBe('INVESTOR_INACTIVE');
  });
  test('allowPendingApproval option', () => {
    expect(
      investorAllocationAllowed(
        { status: 'ACTIVE', kycStatus: 'APPROVED', complianceApprovalStatus: 'PENDING' },
        { allowPendingApproval: true }
      ).ok
    ).toBe(true);
  });
});
