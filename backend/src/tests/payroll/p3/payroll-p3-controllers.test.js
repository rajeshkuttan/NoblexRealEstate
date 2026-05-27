jest.mock('../../../utils/companyScope', () => {
  const actual = jest.requireActual('../../../utils/companyScope');
  return {
    ...actual,
    assertRecordInCompany: jest.fn(),
    withCompanyId: (req, p) => ({ ...p, companyId: req.companyId }),
    stripCompanyFromBody: (b) => {
      const c = { ...b };
      delete c.company_id;
      return c;
    },
    companyWhere: (req) => ({ companyId: req.companyId }),
  };
});

jest.mock('../../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn(),
  COMPANY_AUDIT_ACTIONS: {
    PAYROLL_RUN_CREATED: 'PAYROLL_RUN_CREATED',
    PAYROLL_CALCULATED: 'PAYROLL_CALCULATED',
    PAYROLL_APPROVED: 'PAYROLL_APPROVED',
    PAYROLL_LOCKED: 'PAYROLL_LOCKED',
    PAYROLL_REVERSED: 'PAYROLL_REVERSED',
  },
}));

jest.mock('../../../services/payroll/payrollCalculationService', () => ({
  generatePayroll: jest.fn().mockResolvedValue({ run: { id: 1 }, exceptions: [], processed: 5 }),
}));

jest.mock('../../../services/payroll/payrollRunGuard', () => ({
  assertPayrollPeriodOpen: jest.fn().mockResolvedValue({ id: 1, status: 'GENERATED' }),
  PayrollRunLockedError: class extends Error {
    constructor() {
      super('locked');
      this.statusCode = 403;
    }
  },
  LOCKED_RUN_MESSAGE: 'Payroll run is locked or approved',
}));

const payRun = require('../../../controllers/payrollRunController');
const { PayrollRun } = require('../../../models');
const { assertRecordInCompany } = require('../../../utils/companyScope');
const { generatePayroll } = require('../../../services/payroll/payrollCalculationService');

describe('payrollRunController', () => {
  afterEach(() => jest.clearAllMocks());

  test('approve requires CALCULATED status', async () => {
    assertRecordInCompany.mockResolvedValue({ id: 1, status: 'DRAFT', update: jest.fn() });
    const status = jest.fn(() => ({ json: jest.fn() }));
    await payRun.approve({ companyId: 1, params: { id: '1' } }, { status, json: jest.fn() }, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
  });

  test('lock requires APPROVED', async () => {
    assertRecordInCompany.mockResolvedValue({ id: 1, status: 'CALCULATED', update: jest.fn() });
    const status = jest.fn(() => ({ json: jest.fn() }));
    await payRun.lock({ companyId: 1, params: { id: '1' } }, { status, json: jest.fn() }, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
  });

  test('calculate invokes generatePayroll', async () => {
    assertRecordInCompany.mockResolvedValue({ id: 1, status: 'DRAFT' });
    const json = jest.fn();
    await payRun.calculate(
      { companyId: 1, user: { id: 2 }, params: { id: '1' } },
      { json },
      jest.fn()
    );
    expect(generatePayroll).toHaveBeenCalled();
    expect(json).toHaveBeenCalled();
  });
});
