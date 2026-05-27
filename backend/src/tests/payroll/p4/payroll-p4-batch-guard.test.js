const { assertBatchNotExported, WpsBatchExportedError } = require('../../../services/payroll/payrollWpsBatchGuard');

describe('payrollWpsBatchGuard', () => {
  test('allows non-exported batch', () => {
    expect(() => assertBatchNotExported({ status: 'APPROVED' })).not.toThrow();
  });

  test('blocks EXPORTED batch', () => {
    expect(() => assertBatchNotExported({ status: 'EXPORTED' })).toThrow(WpsBatchExportedError);
  });

  test('exported error has statusCode 400', () => {
    try {
      assertBatchNotExported({ status: 'EXPORTED' });
    } catch (e) {
      expect(e.statusCode).toBe(400);
    }
  });
});
