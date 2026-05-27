jest.mock('../../../models', () => ({
  PayrollRun: { findOne: jest.fn() },
  PayrollPeriod: { findOne: jest.fn() },
}));

const { PayrollRun, PayrollPeriod } = require('../../../models');
const { assertRunNotLocked, assertPayrollPeriodOpen, PayrollRunLockedError } = require('../../../services/payroll/payrollRunGuard');

describe('payrollRunGuard', () => {
  afterEach(() => jest.clearAllMocks());

  test('blocks LOCKED run', async () => {
    PayrollRun.findOne.mockResolvedValue({ id: 1, status: 'LOCKED', companyId: 1 });
    await expect(assertRunNotLocked(1, 1)).rejects.toBeInstanceOf(PayrollRunLockedError);
  });

  test('allows DRAFT run', async () => {
    PayrollRun.findOne.mockResolvedValue({ id: 1, status: 'DRAFT', companyId: 1 });
    const run = await assertRunNotLocked(1, 1);
    expect(run.status).toBe('DRAFT');
  });

  test('blocks LOCKED period', async () => {
    PayrollPeriod.findOne.mockResolvedValue({ id: 1, status: 'LOCKED', companyId: 1 });
    await expect(assertPayrollPeriodOpen(1, 1)).rejects.toBeInstanceOf(PayrollRunLockedError);
  });
});
