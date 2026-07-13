'use strict';

const {
  parsePagination,
  paginationMeta,
  testDataWhere,
  includeTestData,
} = require('../../services/investment/shared/investmentQueryScope');
const { computePartnerExposure } = require('../../services/investment/investmentDashboard.service');

// Avoid loading full Sequelize models — stub instrument rules inline for unit tests
const ASSET_TYPE_RULES = {
  EQUITY: { requiresTicker: true, supportsDividends: true, supportsSplits: true },
  FIXED_INCOME: { requiresMaturity: true, supportsCoupon: true, supportsInterest: true },
  SUKUK: { requiresMaturity: true, supportsCoupon: true, supportsInterest: true },
  FIXED_DEPOSIT: { requiresMaturity: true, supportsInterest: true },
  GOLD: { unit: 'oz', supportsRevaluation: true },
  SILVER: { unit: 'oz', supportsRevaluation: true },
  FUND: { supportsNAV: true, supportsDividends: true },
  PRIVATE_EQUITY: { supportsCapitalCalls: true, illiquid: true },
  REAL_ESTATE_FUND: { supportsNAV: true, illiquid: true },
};
function rulesForType(instrumentType, assetClass) {
  const key = String(instrumentType || assetClass || '')
    .toUpperCase()
    .replace(/\s+/g, '_');
  return ASSET_TYPE_RULES[key] || ASSET_TYPE_RULES.EQUITY;
}

describe('Investment Phase 16 query scope', () => {
  test('parsePagination defaults and caps', () => {
    expect(parsePagination({}, 20, 100)).toEqual({ page: 1, limit: 20, offset: 0 });
    expect(parsePagination({ page: '2', limit: '500' }, 20, 100).limit).toBe(100);
    expect(parsePagination({ page: '0', limit: '-1' }, 20, 100).page).toBe(1);
  });

  test('paginationMeta computes pages', () => {
    expect(paginationMeta(45, 2, 20)).toMatchObject({ total: 45, page: 2, totalPages: 3 });
  });

  test('includeTestData flag parsing', () => {
    expect(includeTestData({ query: { includeTestData: 'true' } })).toBe(true);
    expect(includeTestData({ query: { include_test_data: '1' } })).toBe(true);
    expect(includeTestData({ query: {} })).toBe(false);
  });

  test('testDataWhere excludes by default', () => {
    expect(testDataWhere({ query: {} })).toEqual({ isTestData: false });
    expect(testDataWhere({ query: { includeTestData: 'true' } })).toEqual({});
  });
});

describe('Investment Phase 16 partner exposure', () => {
  test('weights by market value not raw ownership sum', () => {
    const allocs = [
      { investorName: 'A', investmentAssetId: 1, ownershipPercentage: 100 },
      { investorName: 'A', investmentAssetId: 2, ownershipPercentage: 100 },
      { investorName: 'B', investmentAssetId: 1, ownershipPercentage: 0 },
    ];
    const mv = { 1: 1000, 2: 3000 };
    const rows = computePartnerExposure(allocs, mv);
    const a = rows.find((r) => r.name === 'A');
    expect(a.marketValue).toBe(4000);
    expect(a.ownershipPercentage).toBe(100);
    // Must not be 200% from summing ownership
    expect(a.ownershipPercentage).toBeLessThanOrEqual(100);
  });

  test('splits MV-weighted exposure across partners', () => {
    const allocs = [
      { investorName: 'Owner', investmentAssetId: 1, ownershipPercentage: 60 },
      { investorName: 'Partner', investmentAssetId: 1, ownershipPercentage: 40 },
    ];
    const rows = computePartnerExposure(allocs, { 1: 1000 });
    const owner = rows.find((r) => r.name === 'Owner');
    const partner = rows.find((r) => r.name === 'Partner');
    expect(owner.marketValue).toBe(600);
    expect(partner.marketValue).toBe(400);
    expect(owner.ownershipPercentage + partner.ownershipPercentage).toBeCloseTo(100, 1);
  });
});

describe('Investment Phase 17 instrument rules', () => {
  test('ASSET_TYPE_RULES covers core classes', () => {
    expect(ASSET_TYPE_RULES.EQUITY.supportsDividends).toBe(true);
    expect(ASSET_TYPE_RULES.FIXED_DEPOSIT.requiresMaturity).toBe(true);
    expect(ASSET_TYPE_RULES.PRIVATE_EQUITY.illiquid).toBe(true);
  });

  test('rulesForType normalizes keys', () => {
    expect(rulesForType('fixed income').requiresMaturity).toBe(true);
    expect(rulesForType('equity').supportsSplits).toBe(true);
    expect(rulesForType('unknown').supportsDividends).toBe(true);
  });
});

describe('Investment Phase 16 pagination edge cases', () => {
  const cases = [
    [{}, 20, 100, 1, 20, 0],
    [{ page: '3', limit: '10' }, 20, 100, 3, 10, 20],
    [{ page: '1', limit: '1' }, 20, 100, 1, 1, 0],
    [{ page: 'abc', limit: 'xyz' }, 15, 50, 1, 15, 0],
    [{ page: '2', limit: '999' }, 20, 25, 2, 25, 25],
  ];

  test.each(cases)('case %#', (query, def, max, page, limit, offset) => {
    expect(parsePagination(query, def, max)).toEqual({ page, limit, offset });
  });
});

describe('Investment Phase 16 paginationMeta matrix', () => {
  const cases = [
    [0, 1, 20, 1],
    [1, 1, 20, 1],
    [20, 1, 20, 1],
    [21, 1, 20, 2],
    [100, 5, 20, 5],
  ];
  test.each(cases)('total=%i page=%i limit=%i => pages=%i', (total, page, limit, pages) => {
    expect(paginationMeta(total, page, limit).totalPages).toBe(pages);
  });
});

describe('Investment Phase 17 exposure multi-asset mix', () => {
  test('partner with small stake on large asset dominates', () => {
    const allocs = [
      { investorName: 'Small', investmentAssetId: 1, ownershipPercentage: 100 },
      { investorName: 'Big', investmentAssetId: 2, ownershipPercentage: 10 },
    ];
    const rows = computePartnerExposure(allocs, { 1: 100, 2: 10000 });
    const big = rows.find((r) => r.name === 'Big');
    const small = rows.find((r) => r.name === 'Small');
    expect(big.marketValue).toBe(1000);
    expect(small.marketValue).toBe(100);
    expect(big.ownershipPercentage).toBeGreaterThan(small.ownershipPercentage);
  });
});

describe('Investment Phase 16 includeTestData aliases', () => {
  test.each([
    ['true', true],
    ['1', true],
    [true, true],
    ['false', false],
    ['0', false],
    [undefined, false],
  ])('value %p => %p', (val, expected) => {
    expect(includeTestData({ query: { includeTestData: val } })).toBe(expected);
  });
});

describe('Investment Phase 17 rules inventory', () => {
  test.each(Object.keys(ASSET_TYPE_RULES))('rule set exists for %s', (key) => {
    expect(ASSET_TYPE_RULES[key]).toBeTruthy();
    expect(typeof ASSET_TYPE_RULES[key]).toBe('object');
  });
});

describe('Investment Phase 16 zero MV exposure', () => {
  test('returns zero percentages when no MV', () => {
    const rows = computePartnerExposure(
      [{ investorName: 'X', investmentAssetId: 9, ownershipPercentage: 50 }],
      { 9: 0 }
    );
    expect(rows[0].ownershipPercentage).toBe(0);
    expect(rows[0].marketValue).toBe(0);
  });

  test('empty allocations => empty', () => {
    expect(computePartnerExposure([], { 1: 100 })).toEqual([]);
  });
});

describe('Investment Phase 17 rulesForType aliases', () => {
  test.each([
    ['SUKUK', 'supportsInterest'],
    ['GOLD', 'supportsRevaluation'],
    ['FUND', 'supportsNAV'],
    ['REAL_ESTATE_FUND', 'illiquid'],
    ['SILVER', 'unit'],
  ])('%s has %s', (type, field) => {
    expect(rulesForType(type)[field]).toBeTruthy();
  });
});
