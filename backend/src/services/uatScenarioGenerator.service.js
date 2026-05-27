const { AUDIT_CODES } = require('./dataIntegrityAudit.service');
const { AUDIT_CODE: PERM_CODE } = require('./permissionAudit.service');

function getUatScenarios() {
  return [
    {
      id: 'mc-posting-isolation',
      title: 'Multi-company posting isolation',
      steps: [
        'Switch to Company A; post an invoice and payment.',
        'Switch to Company B; verify Company A documents are not visible in lists.',
        'Attempt API call with Company A header while viewing B data IDs — expect 400.',
      ],
      expectedResult: 'No cross-company posting or visibility.',
      relatedAuditCodes: [AUDIT_CODES.CROSS_COMPANY],
    },
    {
      id: 'cross-company-attack',
      title: 'Cross-company reference attack',
      steps: [
        'Create lease in Company A; note lease ID.',
        'Switch to Company B; attempt to create invoice linked to Company A lease ID.',
      ],
      expectedResult: 'Request blocked with company scope error.',
      relatedAuditCodes: [AUDIT_CODES.CROSS_COMPANY],
    },
    {
      id: 'period-hard-close',
      title: 'Hard-closed period posting',
      steps: [
        'Hard-close financial period containing today in Company Finance Config.',
        'Attempt to post invoice/JV dated in that period.',
      ],
      expectedResult: 'Posting rejected — financial period is closed.',
      relatedAuditCodes: [AUDIT_CODES.PERIOD],
    },
    {
      id: 'vat-submitted-lock',
      title: 'VAT submitted period edit',
      steps: [
        'Submit VAT period for current quarter.',
        'Attempt to edit vendor invoice dated in that period.',
      ],
      expectedResult: 'Edit rejected — VAT period submitted.',
      relatedAuditCodes: [AUDIT_CODES.VAT],
    },
    {
      id: 'numbering-collision',
      title: 'Duplicate document numbering',
      steps: [
        'Create two invoices in same company with manually forced duplicate number (if UI allows) or via DB seed.',
        'Run system integrity scan.',
      ],
      expectedResult: 'NUMBERING_CONFLICT_FOUND in health dashboard.',
      relatedAuditCodes: [AUDIT_CODES.NUMBERING],
    },
    {
      id: 'cache-company-switch',
      title: 'Company switch cache isolation',
      steps: [
        'Open Dashboard, Reports, PDC, Finance, Tickets with Company A.',
        'Switch A → B → A → B; reload each screen.',
      ],
      expectedResult: 'No stale Company A figures while on Company B.',
      relatedAuditCodes: [],
    },
    {
      id: 'permission-audit',
      title: 'Inactive user company assignment',
      steps: [
        'Deactivate a user who remains on company_users.',
        'Run integrity scan.',
      ],
      expectedResult: 'Permission Issues finding recorded.',
      relatedAuditCodes: [PERM_CODE],
    },
  ];
}

module.exports = { getUatScenarios };
