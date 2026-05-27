jest.mock('../../../models', () => ({
  PayrollDocumentDistributionQueue: { create: jest.fn() },
  PayrollExport: { findAll: jest.fn() },
  PayrollPayslip: { findAll: jest.fn() },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  createWriteStream: jest.fn(() => ({
    on: jest.fn((ev, cb) => {
      if (ev === 'close') setTimeout(cb, 0);
      return { on: jest.fn() };
    }),
  })),
}));

jest.mock('archiver', () => {
  return jest.fn(() => ({
    pipe: jest.fn(),
    file: jest.fn(),
    on: jest.fn((ev, cb) => {
      if (ev === 'error') return { on: jest.fn() };
      return { on: jest.fn() };
    }),
    finalize: jest.fn(),
  }));
});

const { PayrollDocumentDistributionQueue } = require('../../../models');
const { prepareDistributionPackage } = require('../../../services/payroll/payrollDocumentDistribution.service');

describe('payrollDocumentDistribution', () => {
  test('prepare creates queue rows without sending email', async () => {
    PayrollDocumentDistributionQueue.create.mockResolvedValue({ id: 1, status: 'PENDING' });
    const rows = await prepareDistributionPackage({
      req: { companyId: 1 },
      documentRefs: [{ payslip_id: 1 }],
      recipientEmail: 'test@example.com',
    });
    expect(rows).toHaveLength(1);
    expect(PayrollDocumentDistributionQueue.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING', channel: 'EMAIL' })
    );
  });
});
