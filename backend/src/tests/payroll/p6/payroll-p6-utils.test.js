const { round2, assertBalanced, buildAtLine } = require('../../../services/payroll/payrollFinancePostingUtils');

describe('payrollFinancePostingUtils', () => {
  test('round2 rounds to 2 decimals', () => {
    expect(round2(1.006)).toBe(1.01);
    expect(round2(10.1 + 10.2)).toBe(20.3);
  });

  test('assertBalanced passes when Dr equals Cr', () => {
    expect(() =>
      assertBalanced([
        { debitAmount: 100, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 100 },
      ])
    ).not.toThrow();
  });

  test('assertBalanced throws when unbalanced', () => {
    expect(() => assertBalanced([{ debitAmount: 100, creditAmount: 0 }])).toThrow(/Unbalanced/);
  });

  test('buildAtLine sets Dr when debit positive', () => {
    const line = buildAtLine({
      transactionNo: 100001,
      transactionDate: '2026-05-01',
      jvNumber: 'PR-1',
      ledgerId: 10,
      debit: 500,
      credit: 0,
      narration: 'Basic',
      payrollRunId: 1,
    });
    expect(line.crDr).toBe('Dr');
    expect(line.debitAmount).toBe(500);
    expect(line.payrollRunId).toBe(1);
  });

  test('buildAtLine sets Cr when credit positive', () => {
    const line = buildAtLine({
      transactionNo: 100002,
      transactionDate: '2026-05-01',
      jvNumber: 'PR-1',
      ledgerId: 20,
      debit: 0,
      credit: 500,
      narration: 'Payable',
    });
    expect(line.crDr).toBe('Cr');
    expect(line.creditAmount).toBe(500);
  });

  test('balanced payroll run posting lines Dr = Cr', () => {
    const lines = [
      buildAtLine({ transactionNo: 1, transactionDate: '2026-01-31', jvNumber: 'PR-9', ledgerId: 1, debit: 8000, credit: 0 }),
      buildAtLine({ transactionNo: 2, transactionDate: '2026-01-31', jvNumber: 'PR-9', ledgerId: 2, debit: 2000, credit: 0 }),
      buildAtLine({ transactionNo: 3, transactionDate: '2026-01-31', jvNumber: 'PR-9', ledgerId: 3, debit: 0, credit: 10000 }),
    ];
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  test('loan recovery pattern balances', () => {
    const lines = [
      buildAtLine({ transactionNo: 1, transactionDate: '2026-01-31', jvNumber: 'PR-1', ledgerId: 1, debit: 0, credit: 500 }),
      buildAtLine({ transactionNo: 2, transactionDate: '2026-01-31', jvNumber: 'PR-1', ledgerId: 2, debit: 500, credit: 0 }),
    ];
    expect(() => assertBalanced(lines)).not.toThrow();
  });

  test('reversal swaps debit and credit conceptually', () => {
    const original = buildAtLine({
      transactionNo: 1,
      transactionDate: '2026-01-31',
      jvNumber: 'PR-1',
      ledgerId: 5,
      debit: 100,
      credit: 0,
    });
    const reversed = {
      debitAmount: original.creditAmount,
      creditAmount: original.debitAmount,
    };
    expect(reversed.debitAmount).toBe(0);
    expect(reversed.creditAmount).toBe(100);
  });
});
