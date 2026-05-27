const PAYROLL_PERMISSIONS = [
  'payroll.view',
  'payroll.manage',
  'payroll.approve',
  'payroll.finance.view',
  'payroll.finance.manage',
  'payroll.finance.approve',
  'payroll.documents.view',
  'payroll.documents.manage',
  'payroll.documents.publish',
];

function buildReq(companyId, userId, extra = {}) {
  return {
    companyId,
    user: userId ? { id: userId } : null,
    userPermissions: extra.userPermissions || PAYROLL_PERMISSIONS,
    ...extra,
  };
}

module.exports = { buildReq, PAYROLL_PERMISSIONS };
