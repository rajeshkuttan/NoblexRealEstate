const { calculateNoticeRecovery } = require('../../../services/payroll/payrollNoticeRecoveryService');

describe('payrollNoticeRecoveryService', () => {
  const structure = {
    lines: [{ amount: 6000, component: { componentCode: 'BASIC' } }],
  };

  test('notice shortfall deduction', () => {
    const r = calculateNoticeRecovery({
      separation: { separationType: 'RESIGNATION', noticeDays: 30, servedNoticeDays: 10 },
      salaryStructure: structure,
      eosConfig: { noticeRecoveryEnabled: true },
    });
    expect(r.shortfallDays).toBe(20);
    expect(r.amount).toBeCloseTo(4000, 0);
  });

  test('no shortfall when served fully', () => {
    const r = calculateNoticeRecovery({
      separation: { separationType: 'RESIGNATION', noticeDays: 30, servedNoticeDays: 30 },
      salaryStructure: structure,
    });
    expect(r.amount).toBe(0);
  });

  test('retirement exempt', () => {
    const r = calculateNoticeRecovery({
      separation: { separationType: 'RETIREMENT', noticeDays: 30, servedNoticeDays: 0 },
      salaryStructure: structure,
    });
    expect(r.skipped).toBe(true);
  });
});
