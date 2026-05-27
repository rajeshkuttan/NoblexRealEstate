const EARNING_TYPES = new Set(['EOSB', 'LEAVE_ENCASHMENT', 'SALARY_PAYABLE', 'BONUS']);
const DEDUCTION_TYPES = new Set(['LOAN_RECOVERY', 'NOTICE_RECOVERY', 'DEDUCTION', 'ADJUSTMENT']);

function aggregateLines(lineRows) {
  let gross = 0;
  let deductions = 0;
  for (const line of lineRows) {
    if (EARNING_TYPES.has(line.componentType)) gross += line.amount;
    if (DEDUCTION_TYPES.has(line.componentType)) deductions += line.amount;
  }
  return { gross, deductions, net: gross - deductions };
}

describe('settlement aggregation', () => {
  test('net equals gross minus deductions', () => {
    const lines = [
      { componentType: 'EOSB', amount: 10000 },
      { componentType: 'LEAVE_ENCASHMENT', amount: 2000 },
      { componentType: 'LOAN_RECOVERY', amount: 3000 },
      { componentType: 'NOTICE_RECOVERY', amount: 500 },
    ];
    const { gross, deductions, net } = aggregateLines(lines);
    expect(gross).toBe(12000);
    expect(deductions).toBe(3500);
    expect(net).toBe(8500);
  });
});
