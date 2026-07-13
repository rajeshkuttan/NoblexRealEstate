'use strict';

const {
  detectExportIntent,
  proposeGenerateReportExport,
} = require('../../copilot/actions/reportExportAction');
const { clearAllForTests } = require('../../copilot/actions/pendingActionStore');

describe('reportExportAction', () => {
  beforeEach(() => clearAllForTests());

  test('detects excel export intent', () => {
    const d = detectExportIntent('please export this to excel');
    expect(d).toBeTruthy();
    expect(d.format).toBe('xlsx');
  });

  test('detects pdf export intent', () => {
    const d = detectExportIntent('download pdf report of this answer');
    expect(d).toBeTruthy();
    expect(d.format).toBe('pdf');
  });

  test('propose denied without permission', () => {
    const r = proposeGenerateReportExport({
      companyId: 1,
      userId: 1,
      userPermissions: ['module:copilot:use'],
      conversationId: 9,
      query: 'export to excel',
    });
    expect(r.status).toBe('denied');
  });

  test('propose pending with export permission', () => {
    const r = proposeGenerateReportExport({
      companyId: 1,
      userId: 1,
      userPermissions: ['module:copilot:export'],
      conversationId: 9,
      query: 'generate report as pdf',
    });
    expect(r.status).toBe('pending_confirmation');
    expect(r.confirmationToken).toBeTruthy();
    expect(r.preview.category).toBe('pdf');
  });
});
