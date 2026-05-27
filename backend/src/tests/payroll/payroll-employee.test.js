jest.mock('../../utils/companyScope', () => {
  const actual = jest.requireActual('../../utils/companyScope');
  return {
    ...actual,
    assertRecordInCompany: jest.fn(),
    assertEmployeeInCompany: jest.fn().mockResolvedValue(true),
    withCompanyId: (req, p) => ({ ...p, companyId: req.companyId }),
    stripCompanyFromBody: (b) => b,
    companyWhere: (req) => ({ companyId: req.companyId }),
  };
});

jest.mock('../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn().mockResolvedValue(undefined),
  COMPANY_AUDIT_ACTIONS: {
    EMPLOYEE_CREATED: 'EMPLOYEE_CREATED',
    EMPLOYEE_UPDATED: 'EMPLOYEE_UPDATED',
    PROMOTION_RECORDED: 'PROMOTION_RECORDED',
    TRANSFER_RECORDED: 'TRANSFER_RECORDED',
  },
}));

const empCtrl = require('../../controllers/payrollEmployeeController');
const { Employee, EmployeeHistory } = require('../../models');
const { assertRecordInCompany } = require('../../utils/companyScope');

describe('Payroll employee controller', () => {
  afterEach(() => jest.restoreAllMocks());

  test('create logs EMPLOYEE_CREATED', async () => {
    const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../../services/companyAuditService');
    jest.spyOn(Employee, 'create').mockResolvedValue({ id: 5, employeeNo: 'E001', employeeName: 'Ali' });
    const json = jest.fn();
    await empCtrl.create(
      { companyId: 1, user: { id: 2 }, body: { employeeNo: 'E001', employeeName: 'Ali' } },
      { status: (c) => ({ json }), json },
      jest.fn()
    );
    expect(logCompanyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: COMPANY_AUDIT_ACTIONS.EMPLOYEE_CREATED })
    );
  });

  test('addHistory promotion uses PROMOTION_RECORDED audit', async () => {
    const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../../services/companyAuditService');
    jest.spyOn(EmployeeHistory, 'create').mockResolvedValue({ id: 1 });
    const json = jest.fn();
    await empCtrl.addHistory(
      {
        companyId: 1,
        user: { id: 2 },
        params: { id: '3' },
        body: { eventType: 'PROMOTION', eventDate: '2026-01-01' },
      },
      { status: (c) => ({ json }), json },
      jest.fn()
    );
    expect(logCompanyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: COMPANY_AUDIT_ACTIONS.PROMOTION_RECORDED })
    );
  });

  test('remove deactivates employee', async () => {
    const row = { update: jest.fn().mockResolvedValue(true) };
    assertRecordInCompany.mockResolvedValue(row);
    const json = jest.fn();
    await empCtrl.remove({ companyId: 1, params: { id: '1' } }, { json }, jest.fn());
    expect(row.update).toHaveBeenCalledWith({ status: 'inactive' });
  });
});
