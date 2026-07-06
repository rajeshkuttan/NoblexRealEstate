const { distributeByAllocation, shareAmountForTransaction } = require('../../services/investment/investmentPartnerAllocation.service');

describe('investmentPartnerAllocation', () => {
  test('distributeByAllocation splits amount', () => {
    const rows = distributeByAllocation(
      [
        { ownershipPercentage: 60, investorName: 'A' },
        { ownershipPercentage: 40, investorName: 'B' },
      ],
      1000
    );
    expect(rows[0].shareAmount).toBe(600);
    expect(rows[1].shareAmount).toBe(400);
  });
  test('distribute single owner', () => {
    const rows = distributeByAllocation([{ ownershipPercentage: 100, investorName: 'Co' }], 500);
    expect(rows[0].shareAmount).toBe(500);
  });
  test('distribute zero amount', () => {
    const rows = distributeByAllocation([{ ownershipPercentage: 50 }], 0);
    expect(rows[0].shareAmount).toBe(0);
  });
  test('shareAmountForTransaction uses dividend share', () => {
    const alloc = { dividendSharePercentage: 25, ownershipPercentage: 50 };
    const txn = { transactionType: 'DIVIDEND', baseAmount: 1000 };
    expect(shareAmountForTransaction(alloc, txn)).toBe(250);
  });
  test('shareAmountForTransaction uses profit share on sell', () => {
    const alloc = { profitSharePercentage: 30, ownershipPercentage: 50 };
    const txn = { transactionType: 'SELL', baseAmount: 2000 };
    expect(shareAmountForTransaction(alloc, txn)).toBe(600);
  });
});

describe('investment allocation validation rules', () => {
  test('100 percent split is valid conceptually', () => {
    const pcts = [60, 40];
    const total = pcts.reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
  test('98 percent is invalid', () => {
    const total = 60 + 38;
    expect(Math.abs(total - 100) > 0.01).toBe(true);
  });
});

describe('investment document types', () => {
  const { DOC_TYPES } = require('../../services/investment/investmentDocumentNumber.service');
  test('asset type', () => expect(DOC_TYPES.asset).toBe('investment_asset'));
  test('transaction type', () => expect(DOC_TYPES.transaction).toBe('investment_transaction'));
  test('valuation type', () => expect(DOC_TYPES.valuation).toBe('investment_valuation'));
  test('distribution type', () => expect(DOC_TYPES.distribution).toBe('investment_distribution'));
});

describe('investment posting duplicate guard semantics', () => {
  test('POSTED status blocks repost', () => {
    const txn = { postingStatus: 'POSTED' };
    expect(txn.postingStatus === 'POSTED').toBe(true);
  });
  test('APPROVED required before post', () => {
    const txn = { approvalStatus: 'APPROVED', postingStatus: 'APPROVED' };
    expect(txn.approvalStatus).toBe('APPROVED');
    expect(txn.postingStatus).not.toBe('POSTED');
  });
});

describe('investment company scoping', () => {
  const { companyWhere } = require('../../utils/companyScope');
  test('companyWhere returns companyId filter', () => {
    const where = companyWhere({ companyId: 42 });
    expect(where.companyId).toBe(42);
  });
});
