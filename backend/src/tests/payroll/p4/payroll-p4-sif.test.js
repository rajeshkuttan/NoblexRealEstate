const { generateSifContent, buildFileName, formatAmount } = require('../../../services/payroll/payrollSIFGeneratorService');

describe('payrollSIFGeneratorService', () => {
  const batch = { id: 5, salaryMonth: 3, salaryYear: 2026 };
  const wpsConfig = { molEstablishmentId: 'MOL123', defaultSalaryType: 'BASIC' };

  test('formatAmount uses 2 decimals', () => {
    expect(formatAmount(1000.5)).toBe('1000.50');
  });

  test('buildFileName includes year month and batch id', () => {
    expect(buildFileName(batch)).toBe('WPS_SIF_202603_B5.txt');
  });

  test('HDR row contains count and total', () => {
    const lines = [
      { validationStatus: 'VALID', salaryAmount: 5000, employeeName: 'A', iban: 'AE070331234567890123456', molPersonalId: 'M1' },
      { validationStatus: 'WARNING', salaryAmount: 3000, employeeName: 'B', iban: 'AE070331234567890123457', molPersonalId: 'M2' },
    ];
    const content = generateSifContent({ batch, wpsConfig, companyName: 'Test Co', lines });
    const rows = content.split('\n');
    expect(rows[0]).toMatch(/^HDR\|/);
    expect(rows[0]).toContain('MOL123');
    expect(rows[0]).toContain('|2|');
    expect(rows[0]).toContain('8000.00');
  });

  test('excludes ERROR lines from EDR', () => {
    const lines = [
      { validationStatus: 'VALID', salaryAmount: 1000, employeeName: 'OK', iban: 'AE070331234567890123456', molPersonalId: 'M1' },
      { validationStatus: 'ERROR', salaryAmount: 2000, employeeName: 'Bad', iban: 'AE070331234567890123457', molPersonalId: 'M2' },
    ];
    const content = generateSifContent({ batch, wpsConfig, companyName: 'Co', lines });
    const edr = content.split('\n').filter((r) => r.startsWith('EDR'));
    expect(edr).toHaveLength(1);
  });

  test('TRL matches exportable count and total', () => {
    const lines = [
      { validationStatus: 'VALID', salaryAmount: 1500.25, employeeName: 'X', iban: 'AE070331234567890123456', molPersonalId: 'M1' },
    ];
    const content = generateSifContent({ batch, wpsConfig, companyName: 'Co', lines });
    const trl = content.split('\n').find((r) => r.startsWith('TRL'));
    expect(trl).toBe('TRL|1|1500.25');
  });

  test('EDR rows use pipe delimiter', () => {
    const lines = [
      { validationStatus: 'VALID', salaryAmount: 100, employeeName: 'N', iban: 'AE070331234567890123456', molPersonalId: 'MID', bankName: 'ENBD' },
    ];
    const content = generateSifContent({ batch, wpsConfig, companyName: 'Co', lines });
    const edr = content.split('\n').find((r) => r.startsWith('EDR'));
    expect(edr.split('|').length).toBeGreaterThanOrEqual(7);
  });
});
