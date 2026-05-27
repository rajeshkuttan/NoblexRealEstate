/**
 * Integration: seed + validate payroll full-cycle for Concord Real Estate.
 * Skips when DB unavailable or company not found.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../../config.env') });

const { sequelize, PayrollRun, PayrollWpsBatch, PayrollFinalSettlement, PayrollPayslip, AccountsTrans } = require('../../../models');
const { buildContext } = require('../../../scripts/payroll-full-cycle/context');
const { runPayrollFullCycleSeed } = require('../../../scripts/seed-payroll-full-cycle');
const { runPayrollFullCycleValidation } = require('../../../scripts/validate-payroll-full-cycle');

jest.setTimeout(180000);

describe('Payroll full-cycle (Concord Real Estate)', () => {
  let companyId;
  let canRun = false;
  let seedCtx;

  beforeAll(async () => {
    try {
      await sequelize.authenticate();
      const ctx = await buildContext();
      companyId = ctx.companyId;
      canRun = true;
    } catch (e) {
      console.warn('payroll-full-cycle: skipped —', e.message);
    }
  });

  afterAll(async () => {
    try {
      await sequelize.close();
    } catch (_) {
      /* ignore */
    }
  });

  beforeEach(function () {
    if (!canRun) this.pending();
  });

  test('seed completes', async () => {
    seedCtx = await runPayrollFullCycleSeed({ companyId });
    expect(seedCtx.handles.payrollRunId).toBeTruthy();
  });

  test('validation passes', async () => {
    const { overallPass, results } = await runPayrollFullCycleValidation({ companyId });
    if (!overallPass) {
      console.warn('Validation failures:', results.filter((r) => !r.pass));
    }
    expect(overallPass).toBe(true);
  });

  test('run LOCKED, WPS EXPORTED, settlement LOCKED', async () => {
    const run = await PayrollRun.findOne({
      where: { companyId, status: 'LOCKED' },
      order: [['id', 'DESC']],
    });
    expect(run).toBeTruthy();

    const wps = await PayrollWpsBatch.findOne({
      where: { companyId, status: 'EXPORTED' },
      order: [['id', 'DESC']],
    });
    expect(wps).toBeTruthy();

    const stl = await PayrollFinalSettlement.findOne({
      where: { companyId, status: 'LOCKED' },
      order: [['id', 'DESC']],
    });
    expect(stl).toBeTruthy();
  });

  test('GL postings balanced', async () => {
    const run = await PayrollRun.findOne({
      where: { companyId, financePostingStatus: 'POSTED' },
      order: [['id', 'DESC']],
    });
    const rows = await AccountsTrans.findAll({
      where: { companyId, payrollRunId: run.id },
    });
    const debits = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
    const credits = rows.reduce((s, r) => s + Number(r.credit || 0), 0);
    expect(Math.abs(debits - credits)).toBeLessThan(0.05);
  });

  test('payslips published', async () => {
    const count = await PayrollPayslip.count({
      where: { companyId, status: 'PUBLISHED' },
    });
    expect(count).toBeGreaterThan(0);
  });
});
