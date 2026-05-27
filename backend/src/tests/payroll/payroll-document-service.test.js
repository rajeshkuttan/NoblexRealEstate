const { Op } = require('sequelize');
const { listExpiringDocuments } = require('../../services/payrollDocumentService');
const { EmployeeDocument } = require('../../models');

jest.mock('../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn().mockResolvedValue(undefined),
  COMPANY_AUDIT_ACTIONS: { DOCUMENT_EXPIRED: 'DOCUMENT_EXPIRED' },
}));

describe('payrollDocumentService', () => {
  afterEach(() => jest.restoreAllMocks());

  test('listExpiringDocuments filters by alert window', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in10 = new Date(today);
    in10.setDate(in10.getDate() + 10);

    jest.spyOn(EmployeeDocument, 'findAll').mockResolvedValue([
      {
        id: 1,
        expiryDate: in10.toISOString().slice(0, 10),
        alertDaysBefore: 30,
        employee: { id: 1, employeeNo: 'E001', employeeName: 'Test' },
      },
      {
        id: 2,
        expiryDate: in10.toISOString().slice(0, 10),
        alertDaysBefore: 5,
        employee: { id: 2, employeeNo: 'E002', employeeName: 'Far' },
      },
    ]);

    const req = { companyId: 1 };
    const rows = await listExpiringDocuments(req, { days: 30 });
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(1);
  });

  test('listExpiringDocuments uses company where', async () => {
    const spy = jest.spyOn(EmployeeDocument, 'findAll').mockResolvedValue([]);
    await listExpiringDocuments({ companyId: 99 }, { days: 30 });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ companyId: 99 }),
      })
    );
  });
});
