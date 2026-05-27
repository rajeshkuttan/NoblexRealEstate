jest.mock('../../../services/payroll/payrollWpsBatchService', () => ({
  generateWpsBatch: jest.fn(),
  getBatchWithLines: jest.fn(),
  reviewBatch: jest.fn(),
  approveBatch: jest.fn(),
  exportBatch: jest.fn(),
  cancelBatch: jest.fn(),
}));

jest.mock('../../../services/companyAuditService', () => ({
  logCompanyEvent: jest.fn(),
  COMPANY_AUDIT_ACTIONS: {
    WPS_BATCH_GENERATED: 'WPS_BATCH_GENERATED',
    WPS_BATCH_APPROVED: 'WPS_BATCH_APPROVED',
    WPS_BATCH_EXPORTED: 'WPS_BATCH_EXPORTED',
    WPS_VALIDATION_FAILED: 'WPS_VALIDATION_FAILED',
    COMPLIANCE_EXCEPTION_FOUND: 'COMPLIANCE_EXCEPTION_FOUND',
  },
}));

jest.mock('../../../utils/companyScope', () => ({
  stripCompanyFromBody: (b) => {
    const c = { ...b };
    delete c.company_id;
    return c;
  },
  companyWhere: (req) => ({ companyId: req.companyId }),
}));

const wpsBatch = require('../../../controllers/payrollWpsBatchController');
const {
  generateWpsBatch,
  getBatchWithLines,
  approveBatch,
  exportBatch,
} = require('../../../services/payroll/payrollWpsBatchService');
const { logCompanyEvent } = require('../../../services/companyAuditService');

describe('payrollWpsBatchController', () => {
  afterEach(() => jest.clearAllMocks());

  test('generate requires payroll_run_id', async () => {
    const status = jest.fn(() => ({ json: jest.fn() }));
    await wpsBatch.generate({ companyId: 1, body: {} }, { status, json: jest.fn() }, jest.fn());
    expect(status).toHaveBeenCalledWith(400);
  });

  test('generate success returns batch', async () => {
    generateWpsBatch.mockResolvedValue({ batch: { id: 9 }, compliance: { issues: [] } });
    getBatchWithLines.mockResolvedValue({ id: 9, status: 'GENERATED' });
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    await wpsBatch.generate(
      { companyId: 1, user: { id: 2 }, body: { payroll_run_id: 5 } },
      { status, json },
      jest.fn()
    );
    expect(generateWpsBatch).toHaveBeenCalled();
    expect(logCompanyEvent).toHaveBeenCalled();
    expect(status).toHaveBeenCalledWith(201);
  });

  test('generate compliance failure returns 400', async () => {
    const err = new Error('Compliance validation failed');
    err.statusCode = 400;
    err.compliance = { issues: [{ severity: 'ERROR' }] };
    generateWpsBatch.mockRejectedValue(err);
    const status = jest.fn(() => ({ json: jest.fn() }));
    await wpsBatch.generate(
      { companyId: 1, body: { payroll_run_id: 5 } },
      { status, json: jest.fn() },
      jest.fn()
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(logCompanyEvent).toHaveBeenCalled();
  });

  test('approve logs audit', async () => {
    approveBatch.mockResolvedValue({ id: 1, status: 'APPROVED' });
    const json = jest.fn();
    await wpsBatch.approve(
      { companyId: 1, user: { id: 2 }, params: { id: '1' } },
      { json },
      jest.fn()
    );
    expect(approveBatch).toHaveBeenCalledWith(1, '1', 2);
    expect(logCompanyEvent).toHaveBeenCalled();
  });

  test('export returns file content', async () => {
    exportBatch.mockResolvedValue({
      fileName: 'test.txt',
      content: 'HDR|...',
      batch: { id: 1 },
    });
    const json = jest.fn();
    await wpsBatch.export(
      { companyId: 1, user: { id: 2 }, params: { id: '1' }, query: {} },
      { json },
      jest.fn()
    );
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.objectContaining({ file_name: 'test.txt' }) })
    );
  });
});
