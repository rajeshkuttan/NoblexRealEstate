jest.mock('../../../models', () => ({
  PayrollFinalSettlement: { findOne: jest.fn() },
  PayrollFinalSettlementLine: {},
  PayrollExport: { create: jest.fn() },
}));

jest.mock('../../../services/payroll/payrollDocumentRender.service', () => ({
  renderAndSavePdf: jest.fn().mockResolvedValue({ relativePath: '/uploads/payroll/documents/1/fs.pdf' }),
}));

const { PayrollFinalSettlement, PayrollExport } = require('../../../models');
const { buildSettlementSnapshot, generateSettlementStatement } = require('../../../services/payroll/payrollSettlementStatement.service');

describe('payrollSettlementStatement', () => {
  test('buildSettlementSnapshot uses frozen calc', () => {
    const snap = buildSettlementSnapshot(
      {
        id: 1,
        settlementNumber: 'FS-1',
        settlementDate: '2026-01-15',
        employeeId: 5,
        calculationSnapshot: { eos: 1000 },
        totalEarnings: 5000,
        totalDeductions: 500,
        netSettlement: 4500,
      },
      [{ componentType: 'EOSB', componentName: 'EOS', amount: 1000 }]
    );
    expect(snap.frozenSnapshot).toEqual({ eos: 1000 });
    expect(snap.netSettlement).toBe(4500);
  });

  test('requires LOCKED', async () => {
    PayrollFinalSettlement.findOne.mockResolvedValue({
      id: 1,
      status: 'APPROVED',
      lines: [],
    });
    await expect(
      generateSettlementStatement({ req: { companyId: 1, user: { id: 1 } }, settlementId: 1 })
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  test('generates export for locked', async () => {
    PayrollFinalSettlement.findOne.mockResolvedValue({
      id: 1,
      status: 'LOCKED',
      settlementNumber: 'FS-1',
      settlementDate: '2026-01-15',
      employeeId: 5,
      calculationSnapshot: {},
      totalEarnings: 100,
      totalDeductions: 0,
      netSettlement: 100,
      lines: [],
    });
    PayrollExport.create.mockResolvedValue({ id: 10 });
    const r = await generateSettlementStatement({ req: { companyId: 1, user: { id: 1 } }, settlementId: 1 });
    expect(r.export.id).toBe(10);
  });
});
