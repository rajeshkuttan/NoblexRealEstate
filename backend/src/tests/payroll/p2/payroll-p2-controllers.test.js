jest.mock('../../../utils/companyScope', () => {
  const actual = jest.requireActual('../../../utils/companyScope');
  return {
    ...actual,
    assertRecordInCompany: jest.fn(),
    assertEmployeeInCompany: jest.fn(),
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
    LEAVE_APPLICATION_SUBMITTED: 'LEAVE_APPLICATION_SUBMITTED',
    ATTENDANCE_PERIOD_LOCKED: 'ATTENDANCE_PERIOD_LOCKED',
  },
}));

jest.mock('../../../services/payroll/payrollAttendancePeriodGuard', () => ({
  assertPeriodNotLocked: jest.fn(),
  assertPeriodNotLockedForRange: jest.fn(),
  AttendancePeriodLockedError: class extends Error {
    constructor() {
      super('Attendance period is locked');
      this.statusCode = 403;
    }
  },
  LOCKED_MESSAGE: 'Attendance period is locked',
}));

const leaveApp = require('../../../controllers/payrollLeaveApplicationController');
const attPeriod = require('../../../controllers/payrollAttendancePeriodController');
const { PayrollLeaveApplication, PayrollAttendancePeriod } = require('../../../models');
const { assertRecordInCompany } = require('../../../utils/companyScope');
const { assertPeriodNotLockedForRange, AttendancePeriodLockedError } = require('../../../services/payroll/payrollAttendancePeriodGuard');

describe('P2 controllers', () => {
  afterEach(() => jest.clearAllMocks());

  test('leave submit returns 400 if not DRAFT', async () => {
    assertRecordInCompany.mockResolvedValue({ id: 1, status: 'APPROVED', update: jest.fn() });
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await leaveApp.submit({ companyId: 1, params: { id: '1' } }, { status, json }, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
  });

  test('leave approve blocked when period locked', async () => {
    assertRecordInCompany.mockResolvedValue({
      id: 1,
      status: 'SUBMITTED',
      fromDate: '2026-06-01',
      toDate: '2026-06-02',
      employeeId: 2,
      leaveTypeId: 1,
      totalDays: 2,
      halfDay: false,
      leaveType: { isPaid: false },
      update: jest.fn(),
    });
    assertPeriodNotLockedForRange.mockRejectedValue(new AttendancePeriodLockedError());
    const json = jest.fn();
    await leaveApp.approve(
      { companyId: 1, user: { id: 1 }, params: { id: '1' } },
      { status: (c) => ({ json }), json },
      jest.fn()
    );
    expect(json).toHaveBeenCalledWith({ message: 'Attendance period is locked' });
  });

  test('period lock returns locked message if already locked', async () => {
    assertRecordInCompany.mockResolvedValue({ id: 1, status: 'LOCKED' });
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await attPeriod.lock({ companyId: 1, params: { id: '1' } }, { status, json }, jest.fn());
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ message: 'Attendance period is locked' });
  });
});
