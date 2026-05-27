jest.mock('../../../services/payroll/payrollFinalSettlementService', () => ({
  generateFinalSettlement: jest.fn(),
  getSettlementWithLines: jest.fn(),
  approveSettlement: jest.fn(),
  lockSettlement: jest.fn(),
  cancelSettlement: jest.fn(),
  assertNoActiveSettlement: jest.fn(),
}));

jest.mock('../../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn(),
  COMPANY_AUDIT_ACTIONS: {
    FINAL_SETTLEMENT_GENERATED: 'FINAL_SETTLEMENT_GENERATED',
    FINAL_SETTLEMENT_APPROVED: 'FINAL_SETTLEMENT_APPROVED',
    FINAL_SETTLEMENT_LOCKED: 'FINAL_SETTLEMENT_LOCKED',
    EOS_CALCULATED: 'EOS_CALCULATED',
    LEAVE_ENCASHMENT_CALCULATED: 'LEAVE_ENCASHMENT_CALCULATED',
  },
}));

const settlementCtrl = require('../../../controllers/payrollFinalSettlementController');
const {
  generateFinalSettlement,
  getSettlementWithLines,
  lockSettlement,
} = require('../../../services/payroll/payrollFinalSettlementService');

describe('payrollFinalSettlementController', () => {
  afterEach(() => jest.clearAllMocks());

  test('calculate invokes generateFinalSettlement', async () => {
    generateFinalSettlement.mockResolvedValue({
      settlement: { id: 1 },
      eosResult: { amount: 100 },
      leaveResult: { amount: 50 },
    });
    getSettlementWithLines.mockResolvedValue({ id: 1, status: 'CALCULATED' });
    const json = jest.fn();
    await settlementCtrl.calculate(
      { companyId: 1, user: { id: 2 }, params: { id: '1' } },
      { json },
      jest.fn()
    );
    expect(generateFinalSettlement).toHaveBeenCalled();
    expect(json).toHaveBeenCalled();
  });

  test('lock invokes lockSettlement', async () => {
    lockSettlement.mockResolvedValue({ id: 1, status: 'LOCKED' });
    const json = jest.fn();
    await settlementCtrl.lock({ companyId: 1, params: { id: '1' } }, { json }, jest.fn());
    expect(lockSettlement).toHaveBeenCalledWith(1, '1');
  });
});
