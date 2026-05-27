const {
  validateEmployeeWpsLine,
  hasBlockingErrors,
} = require('../../../services/payroll/payrollComplianceService');

describe('payrollComplianceService unit', () => {
  const employee = { id: 1, employeeNo: 'E001' };
  const wpsConfig = { molEstablishmentId: 'MOL-1' };

  test('missing IBAN is ERROR for bank transfer', () => {
    const bank = { wpsEnabled: true, paymentMethod: 'BANK_TRANSFER', molPersonalId: 'M1', labourCardNo: 'LC1' };
    const r = validateEmployeeWpsLine(employee, bank, { netSalary: 5000 }, wpsConfig);
    expect(r.status).toBe('ERROR');
    expect(r.issues.some((i) => i.code === 'MISSING_IBAN')).toBe(true);
  });

  test('valid line when IBAN and MOL present', () => {
    const bank = {
      wpsEnabled: true,
      paymentMethod: 'BANK_TRANSFER',
      iban: 'AE070331234567890123456',
      molPersonalId: 'M1',
      labourCardNo: 'LC1',
    };
    const r = validateEmployeeWpsLine(employee, bank, { netSalary: 5000 }, wpsConfig);
    expect(r.status).toBe('VALID');
  });

  test('zero net salary is ERROR', () => {
    const bank = { iban: 'AE070331234567890123456', molPersonalId: 'M1', labourCardNo: 'LC1' };
    const r = validateEmployeeWpsLine(employee, bank, { netSalary: 0 }, wpsConfig);
    expect(r.status).toBe('ERROR');
  });

  test('missing primary bank is WARNING', () => {
    const r = validateEmployeeWpsLine(employee, null, { netSalary: 5000 }, wpsConfig);
    expect(r.issues.some((i) => i.code === 'MISSING_PRIMARY_BANK')).toBe(true);
  });

  test('hasBlockingErrors true when ERROR present', () => {
    expect(hasBlockingErrors([{ severity: 'WARNING' }, { severity: 'ERROR' }])).toBe(true);
  });

  test('hasBlockingErrors false for warnings only', () => {
    expect(hasBlockingErrors([{ severity: 'WARNING' }])).toBe(false);
  });

  test('missing MOL personal ID is ERROR', () => {
    const bank = { iban: 'AE070331234567890123456', labourCardNo: 'LC1', wpsEnabled: true };
    const r = validateEmployeeWpsLine(employee, bank, { netSalary: 100 }, wpsConfig);
    expect(r.issues.some((i) => i.code === 'MISSING_MOL_ID')).toBe(true);
  });

  test('invalid IBAN format is ERROR', () => {
    const bank = {
      iban: 'INVALID',
      molPersonalId: 'M1',
      labourCardNo: 'LC1',
      wpsEnabled: true,
      paymentMethod: 'BANK_TRANSFER',
    };
    const r = validateEmployeeWpsLine(employee, bank, { netSalary: 100 }, wpsConfig);
    expect(r.issues.some((i) => i.code === 'INVALID_IBAN')).toBe(true);
  });
});
