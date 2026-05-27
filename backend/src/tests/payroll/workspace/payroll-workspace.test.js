const payrollWorkspace = require('../../../controllers/payrollWorkspaceController');
const { getPayrollReadiness } = require('../../../services/payroll/payrollReadinessService');

jest.mock('../../../services/payroll/payrollReadinessService', () => ({
  getPayrollReadiness: jest.fn(),
}));

jest.mock('../../../services/payroll/payrollReconciliation.service', () => ({
  getDashboard: jest.fn().mockResolvedValue({ unposted_runs: 1 }),
  getReconciliation: jest.fn(),
}));

jest.mock('../../../services/payroll/payrollDocumentsHub.service', () => ({
  getDashboard: jest.fn().mockResolvedValue({ unpublished_payslips: 2 }),
}));

jest.mock('../../../models', () => {
  const chain = (result) => ({
    findOne: jest.fn().mockResolvedValue(result),
    findAll: jest.fn().mockResolvedValue(result ?? []),
    count: jest.fn().mockResolvedValue(typeof result === 'number' ? result : 0),
    create: jest.fn(),
  });
  return {
    Employee: chain(5),
    PayrollPeriod: chain(null),
    PayrollRun: chain(0),
    PayrollWpsBatch: chain(0),
    PayrollFinalSettlement: chain(0),
    EmployeeDocument: chain(0),
    PayrollLeaveApplication: chain([]),
    PayrollOvertimeRequest: chain([]),
    PayrollLabourTimesheet: chain([]),
    PayrollAttendanceDailySummary: chain([]),
    PayrollRunEmployee: chain([]),
    PayrollRunComponentLine: chain([]),
    PayrollComponent: chain([]),
    Department: chain(null),
    CostCenter: chain(null),
    EmployeeSalaryStructure: chain(null),
    EmployeeSeparation: chain(null),
    EmployeeLedgerHeader: chain(null),
    AuditLog: chain([]),
    User: chain(null),
    PayrollPeriod: chain(null),
  };
});

describe('payroll workspace controller', () => {
  const req = { companyId: 2, query: { month: 6, year: 2026 }, user: { id: 1 } };
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    getPayrollReadiness.mockResolvedValue({
      ready_for_payroll: false,
      pending_leave_approvals: 1,
      period: { month: 6, year: 2026, status: 'OPEN' },
      blocking_issues: ['test'],
    });
  });

  test('commandCenter returns company-scoped payload', async () => {
    await payrollWorkspace.commandCenter(req, res, next);
    expect(res.json).toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.data.kpis).toBeDefined();
    expect(body.data.readiness).toBeDefined();
    expect(getPayrollReadiness).toHaveBeenCalledWith(2, 6, 2026);
  });

  test('audit filters by company entity', async () => {
    const { AuditLog } = require('../../../models');
    AuditLog.findAll.mockResolvedValue([
      { id: 1, action: 'PAYROLL_CALCULATED', createdAt: new Date(), newValue: { run_id: 9 }, user: null },
    ]);
    await payrollWorkspace.audit(
      { ...req, query: { entity_type: 'run', entity_id: 9 } },
      res,
      next
    );
    expect(AuditLog.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entityId: 2 }),
      })
    );
  });
});
