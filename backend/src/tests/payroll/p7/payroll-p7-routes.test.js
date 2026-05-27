const fs = require('fs');
const path = require('path');

const routes = fs.readFileSync(path.join(__dirname, '../../../routes/payroll/index.js'), 'utf8');

describe('P7 route wiring', () => {
  test('payslip generate route', () => expect(routes).toMatch(/\/payslips\/generate/));
  test('payslip batch route', () => expect(routes).toMatch(/\/payslips\/batch/));
  test('payslip publish route', () => expect(routes).toMatch(/\/payslips\/publish/));
  test('certificates generate', () => expect(routes).toMatch(/\/certificates\/generate/));
  test('settlement documents', () => expect(routes).toMatch(/\/settlement-documents/));
  test('exports', () => expect(routes).toMatch(/\/exports/));
  test('distribution prepare', () => expect(routes).toMatch(/\/distribution\/prepare/));
  test('documents hub', () => expect(routes).toMatch(/\/documents-hub\/dashboard/));
  test('payroll.documents.view permission', () => expect(routes).toMatch(/payroll\.documents\.view/));
  test('payroll.documents.manage permission', () => expect(routes).toMatch(/payroll\.documents\.manage/));
});
