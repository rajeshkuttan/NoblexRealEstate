jest.mock('../../utils/companyScope', () => {
  const actual = jest.requireActual('../../utils/companyScope');
  return {
    ...actual,
    assertRecordInCompany: jest.fn().mockResolvedValue({ id: 1, update: jest.fn() }),
    assertEmployeeInCompany: jest.fn().mockResolvedValue(true),
    withCompanyId: (req, p) => ({ ...p, companyId: req.companyId }),
    stripCompanyFromBody: (b) => b,
    companyWhere: (req) => ({ companyId: req.companyId }),
  };
});

jest.mock('../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn(),
  COMPANY_AUDIT_ACTIONS: { LEAVE_POLICY_ASSIGNED: 'LEAVE_POLICY_ASSIGNED' },
}));

const leave = require('../../controllers/payrollLeaveController');
const { LeavePolicy, LeavePolicyAssignment } = require('../../models');

describe('Payroll leave controller', () => {
  test('assignPolicy creates assignment and audits', async () => {
    const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../../services/companyAuditService');
    jest.spyOn(LeavePolicyAssignment, 'create').mockResolvedValue({ id: 10 });
    const json = jest.fn();
    await leave.assignPolicy(
      {
        companyId: 1,
        body: { employeeId: 2, leavePolicyId: 3 },
      },
      { status: (c) => ({ json }), json },
      jest.fn()
    );
    expect(logCompanyEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: COMPANY_AUDIT_ACTIONS.LEAVE_POLICY_ASSIGNED })
    );
  });

  test('listPolicies queries company scope', async () => {
    jest.spyOn(LeavePolicy, 'findAll').mockResolvedValue([]);
    const json = jest.fn();
    await leave.listPolicies({ companyId: 7 }, { json }, jest.fn());
    expect(LeavePolicy.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 7 } })
    );
  });
});
