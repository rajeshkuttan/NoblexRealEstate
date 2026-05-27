const { validateUaeIban, normalizeIban } = require('../../../services/payroll/payrollIbanValidator');

describe('payrollIbanValidator', () => {
  test('valid UAE IBAN AE + 21 digits', () => {
    const r = validateUaeIban('AE070331234567890123456');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('AE070331234567890123456');
  });

  test('strips spaces and uppercases', () => {
    const r = validateUaeIban('ae07 0331 2345 6789 0123 456');
    expect(r.valid).toBe(true);
    expect(r.normalized).toMatch(/^AE\d{21}$/);
  });

  test('rejects empty IBAN', () => {
    expect(validateUaeIban('').valid).toBe(false);
  });

  test('rejects wrong country code', () => {
    expect(validateUaeIban('GB29NWBK60161331926819').valid).toBe(false);
  });

  test('rejects short IBAN', () => {
    expect(validateUaeIban('AE123').valid).toBe(false);
  });

  test('rejects long IBAN', () => {
    expect(validateUaeIban('AE0703312345678901234567').valid).toBe(false);
  });

  test('normalizeIban removes spaces', () => {
    expect(normalizeIban(' ae 12 ')).toBe('AE12');
  });
});
