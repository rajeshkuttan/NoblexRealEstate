const { maskIban } = require('../../../services/payroll/payrollDocumentRender.service');
const { relativePath } = require('../../../services/payroll/payrollDocumentPaths');

describe('payrollDocumentPaths', () => {
  test('relativePath extracts uploads segment', () => {
    const rel = relativePath('C:/app/uploads/payroll/documents/1/file.pdf');
    expect(rel).toContain('/uploads/payroll/');
  });
  test('maskIban empty', () => {
    expect(maskIban(null)).toBe('—');
  });
});
