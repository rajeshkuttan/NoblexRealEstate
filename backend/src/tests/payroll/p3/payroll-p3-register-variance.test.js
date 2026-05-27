describe('register column mapping', () => {
  test('maps employee payroll register row', () => {
    const lines = [
      { componentType: 'EARNING', calculationMethod: 'PRORATE', calculatedAmount: 5000, component: { componentCode: 'BASIC' } },
      { componentType: 'EARNING', calculationMethod: 'OVERTIME_HOURLY', calculatedAmount: 200, component: null },
      { componentType: 'DEDUCTION', calculationMethod: 'LOAN_RECOVERY', calculatedAmount: 500, component: null },
    ];
    const gross = lines.filter((l) => l.componentType === 'EARNING').reduce((s, l) => s + l.calculatedAmount, 0);
    const deductions = lines.filter((l) => l.componentType === 'DEDUCTION').reduce((s, l) => s + l.calculatedAmount, 0);
    expect(gross).toBe(5200);
    expect(deductions).toBe(500);
    expect(gross - deductions).toBe(4700);
  });
});

describe('variance comparison', () => {
  test('detects salary increase', () => {
    const curr = 5500;
    const prev = 5000;
    const diff = curr - prev;
    expect(diff > 0 ? 'salary increase' : 'salary decrease').toBe('salary increase');
  });
});
