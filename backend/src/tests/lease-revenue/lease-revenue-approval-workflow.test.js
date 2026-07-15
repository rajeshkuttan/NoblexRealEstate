'use strict';

let mockScheduleRecord;

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
  LeaseRevenueSchedule: {},
  sequelize: {
    transaction: jest.fn((fn) => fn({})),
  },
}));

jest.mock('../../utils/companyScope', () => ({
  companyWhere: () => ({ companyId: 1 }),
  assertRecordInCompany: jest.fn(() => Promise.resolve(mockScheduleRecord)),
}));

const approval = require('../../services/leaseRevenue/leaseRevenueApproval.service');

const req = (userId = 2) => ({ companyId: 1, user: { id: userId } });

describe('leaseRevenueApproval.service — submit', () => {
  test('submits from DRAFT', async () => {
    mockScheduleRecord = makeRecord({ status: 'DRAFT' });
    const result = await approval.submit(req(2), 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUBMITTED', approvalStatus: 'SUBMITTED', submittedBy: 2 }),
      expect.any(Object)
    );
    expect(result).toBe(mockScheduleRecord);
  });

  test('submits from SCHEDULE_GENERATED', async () => {
    mockScheduleRecord = makeRecord({ status: 'SCHEDULE_GENERATED' });
    await approval.submit(req(3), 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUBMITTED' }),
      expect.any(Object)
    );
  });

  test('rejects submit from ACTIVE', async () => {
    mockScheduleRecord = makeRecord({ status: 'ACTIVE' });
    await expect(approval.submit(req(2), 1)).rejects.toThrow(/Cannot submit/);
  });
});

describe('leaseRevenueApproval.service — approve', () => {
  test('approves and auto-activates when checker differs from maker', async () => {
    mockScheduleRecord = makeRecord({ status: 'SUBMITTED', createdBy: 1, submittedBy: 1 });
    await approval.approve(req(2), 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', approvalStatus: 'APPROVED', approvedBy: 2 }),
      expect.any(Object)
    );
  });

  test('approves without auto-activate when autoActivate is false', async () => {
    mockScheduleRecord = makeRecord({ status: 'SUBMITTED', createdBy: 1 });
    await approval.approve(req(2), 1, { autoActivate: false });
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'APPROVED' }),
      expect.any(Object)
    );
  });

  test('rejects maker approving own record', async () => {
    mockScheduleRecord = makeRecord({ status: 'SUBMITTED', createdBy: 2 });
    await expect(approval.approve(req(2), 1)).rejects.toThrow(/creator cannot approve/i);
  });

  test('rejects submitter approving same record', async () => {
    mockScheduleRecord = makeRecord({ status: 'SUBMITTED', createdBy: 1, submittedBy: 2 });
    await expect(approval.approve(req(2), 1)).rejects.toThrow(/submitter cannot approve/i);
  });

  test('admin can approve own record', async () => {
    mockScheduleRecord = makeRecord({ status: 'SUBMITTED', createdBy: 2, submittedBy: 2 });
    const adminReq = {
      companyId: 1,
      user: { id: 2 },
      userPermissions: ['module:lease_revenue:admin'],
    };
    await approval.approve(adminReq, 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE', approvedBy: 2 }),
      expect.any(Object)
    );
  });

  test('rejects approve from DRAFT', async () => {
    mockScheduleRecord = makeRecord({ status: 'DRAFT' });
    await expect(approval.approve(req(2), 1)).rejects.toThrow(/Cannot approve/);
  });

  test('approves from UNDER_REVIEW', async () => {
    mockScheduleRecord = makeRecord({ status: 'UNDER_REVIEW', createdBy: 1 });
    await approval.approve(req(2), 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      expect.any(Object)
    );
  });
});

describe('leaseRevenueApproval.service — reject', () => {
  test('rejects from SUBMITTED back to DRAFT', async () => {
    mockScheduleRecord = makeRecord({ status: 'SUBMITTED' });
    await approval.reject(req(2), 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'DRAFT', approvalStatus: 'REJECTED' }),
      expect.any(Object)
    );
  });

  test('rejects reject from APPROVED', async () => {
    mockScheduleRecord = makeRecord({ status: 'APPROVED' });
    await expect(approval.reject(req(2), 1)).rejects.toThrow(/Cannot reject/);
  });
});

describe('leaseRevenueApproval.service — activate', () => {
  test('activates from APPROVED', async () => {
    mockScheduleRecord = makeRecord({ status: 'APPROVED' });
    await approval.activate(req(2), 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
      expect.any(Object)
    );
  });

  test('blocks activate from DRAFT', async () => {
    mockScheduleRecord = makeRecord({ status: 'DRAFT' });
    await expect(approval.activate(req(2), 1)).rejects.toThrow(/Cannot activate/);
  });
});

describe('leaseRevenueApproval.service — terminate', () => {
  test('terminates ACTIVE with date and reason', async () => {
    mockScheduleRecord = makeRecord({ status: 'ACTIVE' });
    await approval.terminate(req(2), 1, { effectiveDate: '2026-06-30', reason: 'Early exit' });
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'TERMINATED',
        terminatedOn: '2026-06-30',
        terminationReason: 'Early exit',
      }),
      expect.any(Object)
    );
  });

  test('terminates PARTIALLY_RECOGNIZED', async () => {
    mockScheduleRecord = makeRecord({ status: 'PARTIALLY_RECOGNIZED' });
    await approval.terminate(req(2), 1, {});
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'TERMINATED' }),
      expect.any(Object)
    );
  });

  test('blocks terminate from DRAFT', async () => {
    mockScheduleRecord = makeRecord({ status: 'DRAFT' });
    await expect(approval.terminate(req(2), 1, {})).rejects.toThrow(/Cannot terminate/);
  });
});

describe('leaseRevenueApproval.service — cancel', () => {
  test('cancels from SUBMITTED', async () => {
    mockScheduleRecord = makeRecord({ status: 'SUBMITTED' });
    await approval.cancel(req(2), 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED', approvalStatus: 'CANCELLED' }),
      expect.any(Object)
    );
  });

  test('cancels from APPROVED', async () => {
    mockScheduleRecord = makeRecord({ status: 'APPROVED' });
    await approval.cancel(req(2), 1);
    expect(mockScheduleRecord.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'CANCELLED' }),
      expect.any(Object)
    );
  });

  test('blocks cancel from ACTIVE', async () => {
    mockScheduleRecord = makeRecord({ status: 'ACTIVE' });
    await expect(approval.cancel(req(2), 1)).rejects.toThrow(/Cannot cancel/);
  });
});
