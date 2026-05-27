const fs = require('fs');
const path = require('path');

const read = (p) => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');

describe('Payroll static wiring', () => {
  test('app mounts payroll routes', () => {
    expect(read('app.js')).toMatch(/\/api\/payroll/);
    expect(read('app.js')).toMatch(/payrollRoutes/);
  });

  test('migration file exists', () => {
    expect(
      fs.existsSync(
        path.join(__dirname, '../../migrations/20260605100000-phase-p1-payroll-foundation.js')
      )
    ).toBe(true);
  });

  test('routes include employee history', () => {
    expect(read('routes/payroll/index.js')).toMatch(/\/employees\/:id\/history/);
  });

  test('routes include documents expiring', () => {
    expect(read('routes/payroll/index.js')).toMatch(/\/documents\/expiring/);
  });

  test('P4 WPS routes present', () => {
    const payrollRoutes = read('routes/payroll/index.js');
    expect(payrollRoutes).toMatch(/\/wps\/generate/);
    expect(payrollRoutes).toMatch(/\/wps\/batches/);
  });

  test('P7 payslip and documents routes present', () => {
    const payrollRoutes = read('routes/payroll/index.js');
    expect(payrollRoutes).toMatch(/\/payslips\/generate/);
    expect(payrollRoutes).toMatch(/\/documents-hub\/dashboard/);
  });

  test('P7 migration file exists', () => {
    expect(
      fs.existsSync(
        path.join(__dirname, '../../migrations/20260611100000-phase-p7-payroll-documents.js')
      )
    ).toBe(true);
  });

  test('P4 migration file exists', () => {
    expect(
      fs.existsSync(
        path.join(__dirname, '../../migrations/20260608100000-phase-p4-wps-compliance.js')
      )
    ).toBe(true);
  });

  test('P5 settlement routes present', () => {
    const payrollRoutes = read('routes/payroll/index.js');
    expect(payrollRoutes).toMatch(/\/settlements\/:id\/calculate/);
    expect(payrollRoutes).toMatch(/\/separations/);
  });

  test('P5 migration file exists', () => {
    expect(
      fs.existsSync(
        path.join(__dirname, '../../migrations/20260609100000-phase-p5-final-settlement.js')
      )
    ).toBe(true);
  });

  test('P6 finance routes present', () => {
    const payrollRoutes = read('routes/payroll/index.js');
    expect(payrollRoutes).toMatch(/\/post\/run\/:id/);
    expect(payrollRoutes).toMatch(/\/account-config/);
    expect(payrollRoutes).toMatch(/\/finance\/dashboard/);
    expect(payrollRoutes).toMatch(/\/employee-ledger/);
  });

  test('P6 migration file exists', () => {
    expect(
      fs.existsSync(
        path.join(__dirname, '../../migrations/20260610100000-phase-p6-payroll-finance.js')
      )
    ).toBe(true);
  });
});
