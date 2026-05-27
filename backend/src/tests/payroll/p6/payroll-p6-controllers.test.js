jest.mock('../../../services/payroll/payrollFinancePosting.service', () => ({
  postPayrollRun: jest.fn(),
  reversePayrollRun: jest.fn(),
  postSettlement: jest.fn(),
  reverseSettlement: jest.fn(),
  postWpsClearing: jest.fn(),
}));

jest.mock('../../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn(),
  COMPANY_AUDIT_ACTIONS: {
    PAYROLL_POSTED: 'PAYROLL_POSTED',
    PAYROLL_POSTING_REVERSED: 'PAYROLL_POSTING_REVERSED',
    SETTLEMENT_POSTED: 'SETTLEMENT_POSTED',
    SETTLEMENT_REVERSED: 'SETTLEMENT_REVERSED',
  },
}));

jest.mock('../../../models', () => ({
  PayrollAccountConfiguration: { findOne: jest.fn(), create: jest.fn() },
}));

jest.mock('../../../utils/companyScope', () => ({
  withCompanyId: (req, data) => ({ ...data, companyId: req.companyId }),
  stripCompanyFromBody: (b) => b,
  assertAccountInCompany: jest.fn(),
  assertEmployeeInCompany: jest.fn(),
}));

jest.mock('../../../services/payroll/employeeLedger.service', () => ({
  getEmployeeLedger: jest.fn(),
}));

const postingCtrl = require('../../../controllers/payrollFinancePostingController');
const configCtrl = require('../../../controllers/payrollAccountConfigController');
const ledgerCtrl = require('../../../controllers/payrollEmployeeLedgerController');
const { postPayrollRun, reversePayrollRun } = require('../../../services/payroll/payrollFinancePosting.service');
const { PayrollAccountConfiguration } = require('../../../models');
const { getEmployeeLedger } = require('../../../services/payroll/employeeLedger.service');

describe('P6 controllers', () => {
  afterEach(() => jest.clearAllMocks());

  test('postRun returns success', async () => {
    postPayrollRun.mockResolvedValue({ run: { id: 1 }, transactionNo: 100001 });
    const json = jest.fn();
    await postingCtrl.postRun({ companyId: 1, params: { id: '3' } }, { json }, jest.fn());
    expect(postPayrollRun).toHaveBeenCalledWith({ req: expect.any(Object), runId: 3 });
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('postRun maps service error status', async () => {
    const err = new Error('Payroll run must be APPROVED or LOCKED to post');
    err.statusCode = 400;
    postPayrollRun.mockRejectedValue(err);
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    await postingCtrl.postRun({ companyId: 1, params: { id: '1' } }, { status, json }, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
  });

  test('reverseRun invokes service', async () => {
    reversePayrollRun.mockResolvedValue({ run: { id: 1 } });
    const json = jest.fn();
    await postingCtrl.reverseRun({ companyId: 1, params: { id: '1' } }, { json }, jest.fn());
    expect(reversePayrollRun).toHaveBeenCalled();
  });

  test('account config get', async () => {
    PayrollAccountConfiguration.findOne.mockResolvedValue({ id: 1 });
    const json = jest.fn();
    await configCtrl.get({ companyId: 1 }, { json }, jest.fn());
    expect(json).toHaveBeenCalledWith({ success: true, data: { id: 1 } });
  });

  test('account config update requires payable account', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    await configCtrl.update({ companyId: 1, body: {} }, { status, json }, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
  });

  test('employee ledger requires employee_id', async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    await ledgerCtrl.getLedger({ companyId: 1, query: {} }, { status, json }, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
  });

  test('employee ledger returns data', async () => {
    getEmployeeLedger.mockResolvedValue({ id: 1, lines: [] });
    const json = jest.fn();
    await ledgerCtrl.getLedger(
      { companyId: 1, query: { employee_id: '5' } },
      { json },
      jest.fn()
    );
    expect(getEmployeeLedger).toHaveBeenCalledWith(1, 5);
    expect(json).toHaveBeenCalledWith({ success: true, data: { id: 1, lines: [] } });
  });
});
