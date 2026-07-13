'use strict';

const {
  round2,
  round6,
  daysBetween,
  addDays,
  addMonths,
  accrualFraction,
  computeAccruedAmount,
  computeNetIncome,
  couponGross,
  interestGross,
  dividendGross,
  generatePaymentDates,
  incomeTypeForInstrument,
  canTransitionIncome,
  canTransitionCorporateAction,
  computeEntitlement,
  reconcileIncome,
  previewIncomeJournal,
  INCOME_TRANSITIONS,
  CA_TRANSITIONS,
} = require('../../services/investment/income/incomeEngine.service');

describe('Phase 19 date helpers', () => {
  test('daysBetween', () => {
    expect(daysBetween('2024-01-01', '2024-01-11')).toBe(10);
    expect(daysBetween('2024-01-11', '2024-01-01')).toBe(0);
  });
  test('addDays', () => {
    expect(addDays('2024-01-31', 1)).toBe('2024-02-01');
  });
  test('addMonths end of month', () => {
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
  });
});

describe('Phase 19 accrual', () => {
  test('half period = 0.5 fraction', () => {
    expect(accrualFraction('2024-01-01', '2024-01-11', '2024-01-06')).toBe(0.5);
  });
  test('full period', () => {
    expect(accrualFraction('2024-01-01', '2024-07-01', '2024-07-01')).toBe(1);
  });
  test('before start = 0', () => {
    expect(accrualFraction('2024-06-01', '2024-12-01', '2024-01-01')).toBe(0);
  });
  test('computeAccruedAmount', () => {
    expect(computeAccruedAmount(1000, '2024-01-01', '2024-01-11', '2024-01-06')).toBe(500);
  });
});

describe('Phase 19 income amounts', () => {
  test('net after WHT', () => {
    expect(computeNetIncome(1000, 50)).toBe(950);
  });
  test('coupon semi-annual', () => {
    expect(couponGross({ faceValue: 100, quantity: 10, couponRate: 5, periodFraction: 0.5 })).toBe(25);
  });
  test('interest actual/365', () => {
    expect(interestGross({ principal: 100000, annualRate: 3.65, days: 10, dayCount: 365 })).toBe(100);
  });
  test('dividend', () => {
    expect(dividendGross({ quantity: 1000, perUnit: 0.25 })).toBe(250);
  });
});

describe('Phase 19 payment schedule', () => {
  test('semi-annual generates periods to maturity', () => {
    const dates = generatePaymentDates('2024-01-01', '2025-01-01', 'SEMI_ANNUAL');
    expect(dates.length).toBeGreaterThanOrEqual(2);
    expect(dates[0].paymentDate).toBe('2024-07-01');
    expect(dates[dates.length - 1].paymentDate).toBe('2025-01-01');
  });
  test('quarterly', () => {
    const dates = generatePaymentDates('2024-01-01', '2024-07-01', 'QUARTERLY');
    expect(dates.length).toBeGreaterThanOrEqual(2);
  });
  test('empty without dates', () => {
    expect(generatePaymentDates(null, null)).toEqual([]);
  });
});

describe('Phase 19 income type mapping', () => {
  test.each([
    ['FIXED_DEPOSIT', 'INTEREST'],
    ['SUKUK', 'COUPON'],
    ['FUND', 'FUND_DISTRIBUTION'],
    ['EQUITY', 'DIVIDEND'],
    ['PRIVATE_EQUITY', 'PROFIT_DISTRIBUTION'],
  ])('%s => %s', (type, income) => {
    expect(incomeTypeForInstrument(type)).toBe(income);
  });
});

describe('Phase 19 income transitions', () => {
  const ok = [
    ['EXPECTED', 'ACCRUED'],
    ['EXPECTED', 'RECEIVABLE'],
    ['ACCRUED', 'RECEIVED'],
    ['RECEIVED', 'RECONCILED'],
    ['RECEIVED', 'DISTRIBUTED'],
    ['RECEIVED', 'REINVESTED'],
    ['RECONCILED', 'DISTRIBUTED'],
  ];
  test.each(ok)('%s → %s allowed', (a, b) => {
    expect(canTransitionIncome(a, b)).toBe(true);
  });
  const bad = [
    ['DISTRIBUTED', 'RECEIVED'],
    ['CANCELLED', 'EXPECTED'],
    ['REINVESTED', 'DISTRIBUTED'],
  ];
  test.each(bad)('%s → %s blocked', (a, b) => {
    expect(canTransitionIncome(a, b)).toBe(false);
  });
  test('all statuses in map', () => {
    expect(Object.keys(INCOME_TRANSITIONS).length).toBe(8);
  });
});

describe('Phase 19 corporate action transitions', () => {
  test.each([
    ['ANNOUNCED', 'ENTITLED'],
    ['ENTITLED', 'APPLIED'],
    ['APPLIED', 'SETTLED'],
  ])('%s → %s', (a, b) => {
    expect(canTransitionCorporateAction(a, b)).toBe(true);
  });
  test('SETTLED cannot cancel', () => {
    expect(canTransitionCorporateAction('SETTLED', 'CANCELLED')).toBe(false);
  });
  test('CA_TRANSITIONS size', () => {
    expect(Object.keys(CA_TRANSITIONS).length).toBe(6);
  });
});

describe('Phase 19 entitlements — splits', () => {
  test('2-for-1 stock split', () => {
    const e = computeEntitlement({
      actionType: 'STOCK_SPLIT',
      eligibleQuantity: 100,
      ratioNumerator: 2,
      ratioDenominator: 1,
    });
    expect(e.resultingQuantity).toBe(200);
    expect(e.entitlementQuantity).toBe(100);
  });
  test('1-for-10 reverse split', () => {
    const e = computeEntitlement({
      actionType: 'REVERSE_SPLIT',
      eligibleQuantity: 100,
      ratioNumerator: 1,
      ratioDenominator: 10,
    });
    expect(e.resultingQuantity).toBe(10);
  });
  test('1-for-5 bonus', () => {
    const e = computeEntitlement({
      actionType: 'BONUS_ISSUE',
      eligibleQuantity: 100,
      ratioNumerator: 1,
      ratioDenominator: 5,
    });
    expect(e.entitlementQuantity).toBe(20);
    expect(e.resultingQuantity).toBe(120);
  });
  test('stock dividend same as bonus math', () => {
    const e = computeEntitlement({
      actionType: 'STOCK_DIVIDEND',
      eligibleQuantity: 50,
      ratioNumerator: 1,
      ratioDenominator: 10,
    });
    expect(e.entitlementQuantity).toBe(5);
  });
});

describe('Phase 19 entitlements — cash', () => {
  test('cash dividend per unit', () => {
    const e = computeEntitlement({
      actionType: 'CASH_DIVIDEND',
      eligibleQuantity: 1000,
      cashComponent: 0.5,
    });
    expect(e.entitlementCash).toBe(500);
    expect(e.resultingQuantity).toBe(1000);
  });
  test('maturity redeems position', () => {
    const e = computeEntitlement({
      actionType: 'MATURITY',
      eligibleQuantity: 50,
      cashComponent: 100,
    });
    expect(e.entitlementCash).toBe(5000);
    expect(e.resultingQuantity).toBe(0);
  });
  test('redemption zeros qty', () => {
    const e = computeEntitlement({
      actionType: 'REDEMPTION',
      eligibleQuantity: 10,
      cashComponent: 101,
    });
    expect(e.resultingQuantity).toBe(0);
    expect(e.entitlementCash).toBe(1010);
  });
});

describe('Phase 19 entitlements — rights / merger', () => {
  test('rights issue does not change holding yet', () => {
    const e = computeEntitlement({
      actionType: 'RIGHTS_ISSUE',
      eligibleQuantity: 100,
      ratioNumerator: 1,
      ratioDenominator: 4,
    });
    expect(e.entitlementQuantity).toBe(25);
    expect(e.resultingQuantity).toBe(100);
  });
  test('merger conversion ratio', () => {
    const e = computeEntitlement({
      actionType: 'MERGER',
      eligibleQuantity: 100,
      ratioNumerator: 3,
      ratioDenominator: 2,
    });
    expect(e.resultingQuantity).toBe(150);
  });
});

describe('Phase 19 income reconciliation', () => {
  test('matched when all equal', () => {
    const r = reconcileIncome({ expectedNet: 100, receivedNet: 100, bankReceipt: 100, glIncome: 100 });
    expect(r.matched).toBe(true);
  });
  test('unmatched diffs', () => {
    const r = reconcileIncome({ expectedNet: 100, receivedNet: 95, bankReceipt: 90, glIncome: 100 });
    expect(r.matched).toBe(false);
    expect(r.diffs.expectedVsReceived).toBe(5);
    expect(r.diffs.receivedVsBank).toBe(5);
  });
  test('tolerance under 0.01', () => {
    const r = reconcileIncome({
      expectedNet: 100,
      receivedNet: 100.005,
      bankReceipt: 100,
      glIncome: 100,
    });
    expect(r.matched).toBe(true);
  });
});

describe('Phase 19 journal preview', () => {
  test('accrued lines', () => {
    const j = previewIncomeJournal({ status: 'ACCRUED', accruedAmount: 40, grossAmount: 100 });
    expect(j.lines.length).toBe(2);
    expect(j.lines[0].debit).toBe(40);
  });
  test('received with WHT', () => {
    const j = previewIncomeJournal({
      status: 'RECEIVED',
      netAmount: 95,
      withholdingTax: 5,
    });
    expect(j.lines.some((l) => l.account.includes('Cash'))).toBe(true);
    expect(j.lines.some((l) => l.debit === 5)).toBe(true);
  });
  test('reinvested', () => {
    const j = previewIncomeJournal({ status: 'REINVESTED', netAmount: 200 });
    expect(j.lines[0].account).toMatch(/Investment asset/);
  });
});

describe('Phase 19 rounding', () => {
  test('round2', () => expect(round2(1.005)).toBe(1.01));
  test('round6', () => expect(round6(1.1234567)).toBe(1.123457));
});

describe('Phase 19 entitlement matrix', () => {
  const cases = [
    ['STOCK_SPLIT', 100, 3, 1, 300],
    ['STOCK_SPLIT', 100, 5, 2, 250],
    ['BONUS_ISSUE', 200, 1, 4, 250],
    ['REVERSE_SPLIT', 1000, 1, 5, 200],
  ];
  test.each(cases)('%s qty=%i %i/%i => resulting %i', (type, qty, num, den, result) => {
    const e = computeEntitlement({
      actionType: type,
      eligibleQuantity: qty,
      ratioNumerator: num,
      ratioDenominator: den,
    });
    expect(e.resultingQuantity).toBe(result);
  });
});

describe('Phase 19 cash matrix', () => {
  test.each([
    ['CASH_DIVIDEND', 100, 1.25, 125],
    ['CAPITAL_REPAYMENT', 50, 2, 100],
    ['CALL', 10, 101.5, 1015],
  ])('%s', (type, qty, cash, expected) => {
    expect(
      computeEntitlement({ actionType: type, eligibleQuantity: qty, cashComponent: cash }).entitlementCash
    ).toBe(expected);
  });
});

describe('Phase 19 schedule frequency months', () => {
  test('annual single year', () => {
    const d = generatePaymentDates('2024-01-01', '2025-01-01', 'ANNUAL');
    expect(d.some((x) => x.paymentDate === '2025-01-01')).toBe(true);
  });
  test('monthly short window', () => {
    const d = generatePaymentDates('2024-01-01', '2024-04-01', 'MONTHLY');
    expect(d.length).toBeGreaterThanOrEqual(3);
  });
});

describe('Phase 19 coupon vs interest consistency', () => {
  test('coupon uses face * qty * rate * fraction', () => {
    expect(couponGross({ faceValue: 1000, quantity: 1, couponRate: 4, periodFraction: 1 })).toBe(40);
  });
});
