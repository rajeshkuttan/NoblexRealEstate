'use strict';

let mockExpenseRecord;

function makeRecord(overrides = {}) {
  const base = {
    id: 1,
    status: 'DRAFT',
    createdBy: 1,
    submittedBy: null,
    update: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockImplementation(function reload() {
      return Promise.resolve(this);
    }),
    ...overrides,
  };
  return base;
}

jest.mock('../../models', () => ({
  PrepaidExpense: {},
  sequelize: {
    transaction: jest.fn((fn) => fn({})),
  },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  assertRecordInCompany: jest.fn(() => Promise.resolve(mockExpenseRecord)),
}));

const approval = require('../../services/prepaidExpenses/prepaidApproval.service');

const req = (userId = 2) => ({ companyId: 1, user: { id: userId } });

describe('prepaidApproval.service — submit', () => {
  test('submits from DRAFT', async () => {
    mockExpenseRecord = makeRecord({ status: 'DRAFT' });
    const result = await approval.submit(req(2), 1);
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUBMITTED', approvalStatus: 'SUBMITTED', submittedBy: 2 }),
      expect.any(Object)
    );
    expect(result).toBe(mockExpenseRecord);
  });

  test('submits from SCHEDULE_GENERATED', async () => {
    mockExpenseRecord = makeRecord({ status: 'SCHEDULE_GENERATED' });
    await approval.submit(req(3), 1);
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUBMITTED' }),
      expect.any(Object)
    );
  });

  test('rejects submit from ACTIVE', async () => {
    mockExpenseRecord = makeRecord({ status: 'ACTIVE' });
    await expect(approval.submit(req(2), 1)).rejects.toThrow(/Cannot submit/);
  });
});

describe('prepaidApproval.service — approve', () => {
  test('approves and auto-activates when checker differs from maker', async () => {
    mockExpenseRecord = makeRecord({ status: 'SUBMITTED', createdBy: 1, submittedBy: 1 });
    await approval.approve(req(2), 1);
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', approvalStatus: 'APPROVED', approvedBy: 2 }),
      expect.any(Object)
    );
  });

  test('approves without auto-activate when autoActivate is false', async () => {
    mockExpenseRecord = makeRecord({ status: 'SUBMITTED', createdBy: 1 });
    await approval.approve(req(2), 1, { autoActivate: false });
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED' }),
      expect.any(Object)
    );
  });

  test('rejects maker approving own record', async () => {
    mockExpenseRecord = makeRecord({ status: 'SUBMITTED', createdBy: 2 });
    await expect(approval.approve(req(2), 1)).rejects.toThrow(/creator cannot approve/i);
  });

  test('rejects submitter approving same record', async () => {
    mockExpenseRecord = makeRecord({ status: 'SUBMITTED', createdBy: 1, submittedBy: 2 });
    await expect(approval.approve(req(2), 1)).rejects.toThrow(/submitter cannot approve/i);
  });

  test('admin can approve own record', async () => {
    mockExpenseRecord = makeRecord({ status: 'SUBMITTED', createdBy: 2, submittedBy: 2 });
    const adminReq = {
      companyId: 1,
      user: { id: 2 },
      userPermissions: ['module:prepaid_expenses:admin'],
    };
    await approval.approve(adminReq, 1);
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', approvedBy: 2 }),
      expect.any(Object)
    );
  });

  test('rejects approve from DRAFT', async () => {
    mockExpenseRecord = makeRecord({ status: 'DRAFT' });
    await expect(approval.approve(req(2), 1)).rejects.toThrow(/Cannot approve/);
  });
});

describe('prepaidApproval.service — reject', () => {
  test('rejects from SUBMITTED back to DRAFT', async () => {
    mockExpenseRecord = makeRecord({ status: 'SUBMITTED' });
    await approval.reject(req(2), 1);
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DRAFT', approvalStatus: 'REJECTED' }),
      expect.any(Object)
    );
  });

  test('rejects reject from APPROVED', async () => {
    mockExpenseRecord = makeRecord({ status: 'APPROVED' });
    await expect(approval.reject(req(2), 1)).rejects.toThrow(/Cannot reject/);
  });
});

describe('prepaidApproval.service — activate', () => {
  test('activates from APPROVED', async () => {
    mockExpenseRecord = makeRecord({ status: 'APPROVED' });
    await approval.activate(req(2), 1);
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      expect.any(Object)
    );
  });

  test('blocks activate from DRAFT', async () => {
    mockExpenseRecord = makeRecord({ status: 'DRAFT' });
    await expect(approval.activate(req(2), 1)).rejects.toThrow(/Cannot activate/);
  });
});

describe('prepaidApproval.service — suspend / resume', () => {
  test('suspends ACTIVE with date', async () => {
    mockExpenseRecord = makeRecord({ status: 'ACTIVE' });
    await approval.suspend(req(2), 1, { suspendedFrom: '2026-06-01' });
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUSPENDED', suspendedFrom: '2026-06-01' }),
      expect.any(Object)
    );
  });

  test('resumes SUSPENDED to ACTIVE', async () => {
    mockExpenseRecord = makeRecord({ status: 'SUSPENDED' });
    await approval.resume(req(2), 1);
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      expect.any(Object)
    );
  });

  test('blocks resume from ACTIVE', async () => {
    mockExpenseRecord = makeRecord({ status: 'ACTIVE' });
    await expect(approval.resume(req(2), 1)).rejects.toThrow(/Cannot resume/);
  });
});

describe('prepaidApproval.service — terminate / cancel', () => {
  test('terminates ACTIVE with reason', async () => {
    mockExpenseRecord = makeRecord({ status: 'ACTIVE' });
    await approval.terminate(req(2), 1, { reason: 'Contract ended', terminatedOn: '2026-08-01' });
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'TERMINATED',
        terminatedOn: '2026-08-01',
        terminationReason: 'Contract ended',
      }),
      expect.any(Object)
    );
  });

  test('cancels SUBMITTED', async () => {
    mockExpenseRecord = makeRecord({ status: 'SUBMITTED' });
    await approval.cancel(req(2), 1);
    expect(mockExpenseRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED', approvalStatus: 'CANCELLED' }),
      expect.any(Object)
    );
  });

  test('blocks cancel from ACTIVE', async () => {
    mockExpenseRecord = makeRecord({ status: 'ACTIVE' });
    await expect(approval.cancel(req(2), 1)).rejects.toThrow(/Cannot cancel/);
  });
});
