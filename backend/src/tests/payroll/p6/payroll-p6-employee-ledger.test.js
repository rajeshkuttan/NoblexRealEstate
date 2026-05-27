jest.mock('../../../models', () => ({
  EmployeeLedgerHeader: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
  EmployeeLedgerLine: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

const { EmployeeLedgerHeader, EmployeeLedgerLine } = require('../../../models');
const {
  ensureLedgerHeader,
  appendLedgerLines,
} = require('../../../services/payroll/employeeLedger.service');

describe('employeeLedger.service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('ensureLedgerHeader creates when missing', async () => {
    EmployeeLedgerHeader.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    EmployeeLedgerHeader.create.mockResolvedValue({ id: 1, companyId: 1, employeeId: 5 });
    const h = await ensureLedgerHeader(1, 5);
    expect(EmployeeLedgerHeader.create).toHaveBeenCalled();
    expect(h.id).toBe(1);
  });

  test('ensureLedgerHeader returns existing', async () => {
    const existing = { id: 2, companyId: 1, employeeId: 5 };
    EmployeeLedgerHeader.findOne.mockResolvedValue(existing);
    const h = await ensureLedgerHeader(1, 5);
    expect(EmployeeLedgerHeader.create).not.toHaveBeenCalled();
    expect(h).toBe(existing);
  });

  test('appendLedgerLines updates running balance', async () => {
    EmployeeLedgerHeader.findOne.mockResolvedValue({ id: 10, companyId: 1, employeeId: 5 });
    EmployeeLedgerLine.findOne.mockResolvedValue({ balance: 1000 });
    EmployeeLedgerLine.create.mockImplementation((data) => Promise.resolve(data));

    const result = await appendLedgerLines({
      companyId: 1,
      employeeId: 5,
      sourceType: 'PAYROLL',
      sourceId: 9,
      referenceNo: 'PR-9',
      transactionDate: '2026-01-31',
      entries: [{ credit: 500, description: 'Salary' }],
    });

    expect(EmployeeLedgerLine.create).toHaveBeenCalledWith(
      expect.objectContaining({ credit: 500, balance: 1500 })
    );
    expect(result.lines).toHaveLength(1);
  });

  test('credit increases balance', async () => {
    EmployeeLedgerHeader.findOne.mockResolvedValue({ id: 10 });
    EmployeeLedgerLine.findOne.mockResolvedValue({ balance: 0 });
    EmployeeLedgerLine.create.mockImplementation((d) => d);
    await appendLedgerLines({
      companyId: 1,
      employeeId: 1,
      sourceType: 'PAYROLL',
      sourceId: 1,
      entries: [{ credit: 3000 }],
    });
    expect(EmployeeLedgerLine.create).toHaveBeenCalledWith(expect.objectContaining({ balance: 3000 }));
  });

  test('debit decreases balance', async () => {
    EmployeeLedgerHeader.findOne.mockResolvedValue({ id: 10 });
    EmployeeLedgerLine.findOne.mockResolvedValue({ balance: 5000 });
    EmployeeLedgerLine.create.mockImplementation((d) => d);
    await appendLedgerLines({
      companyId: 1,
      employeeId: 1,
      sourceType: 'RECOVERY',
      sourceId: 2,
      entries: [{ debit: 500 }],
    });
    expect(EmployeeLedgerLine.create).toHaveBeenCalledWith(expect.objectContaining({ balance: 4500 }));
  });
});
