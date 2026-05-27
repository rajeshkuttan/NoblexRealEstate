const { maskIban, substitute } = require('../../../services/payroll/payrollDocumentRender.service');
const { buildPayslipSnapshot } = require('../../../services/payroll/payrollPayslip.service');

describe('payrollDocumentRender utils', () => {
  test('maskIban masks all but last 4', () => {
    expect(maskIban('AE1234567890123456')).toMatch(/3456$/);
    expect(maskIban('AE1234567890123456')).not.toContain('AE12');
  });
  test('substitute replaces vars', () => {
    expect(substitute('Hello {{name}}', { name: 'World' })).toBe('Hello World');
  });
});

describe('buildPayslipSnapshot', () => {
  test('uses snapshot not live employee', () => {
    const snap = buildPayslipSnapshot(
      {
        grossSalary: 10000,
        deductions: 500,
        netSalary: 9500,
        salaryStructureSnapshot: {
          employeeName: 'Frozen Name',
          employeeNo: 'E001',
          iban: 'AE1234567890123456',
        },
        lines: [
          {
            componentType: 'EARNING',
            calculatedAmount: 8000,
            component: { componentCode: 'BASIC', componentName: 'Basic' },
          },
          {
            componentType: 'DEDUCTION',
            calculatedAmount: 500,
            component: { componentCode: 'LOAN', componentName: 'Loan' },
          },
        ],
      },
      { id: 1, runNumber: 'R1' },
      { periodYear: 2026, periodMonth: 1 }
    );
    expect(snap.employee.employeeName).toBe('Frozen Name');
    expect(snap.employee.ibanMasked).toMatch(/3456$/);
    expect(snap.netSalary).toBe(9500);
    expect(snap.earnings).toHaveLength(1);
    expect(snap.deductions).toHaveLength(1);
  });

  test('snapshot immutable fields stored', () => {
    const snap = buildPayslipSnapshot(
      { grossSalary: 1, deductions: 0, netSalary: 1, salaryStructureSnapshot: {}, lines: [] },
      { id: 2 },
      null
    );
    expect(snap.payrollRunId).toBe(2);
  });
});
