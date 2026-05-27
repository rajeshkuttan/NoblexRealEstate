const { sequelize } = require('../config/database');
const { User } = require('../models');
const { getUserEffectivePermissions, normalizeLegacyRole } = require('./rbacService');
const { SYSTEM_ROLE_PERMISSIONS } = require('../config/permissions');
const { makeFinding } = require('./dataIntegrityAudit.service');

const AUDIT_CODE = 'PERMISSION_AUDIT_FAILURE';

const FINANCE_ROLE_KEYS = ['finance_manager', 'finance_executive'];

async function runPermissionAudit({ maxRecords = 50 } = {}) {
  const records = [];
  let total = 0;
  const breakdown = {
    noPermissions: 0,
    inactiveAssignments: 0,
    inactiveCompany: 0,
    financeGap: 0,
  };

  const activeUsers = await User.findAll({
    where: { isActive: true },
    attributes: ['id', 'email', 'role', 'isActive'],
  });

  for (const user of activeUsers) {
    const { permissions } = await getUserEffectivePermissions(user);
    if (!permissions || permissions.length === 0) {
      total += 1;
      breakdown.noPermissions += 1;
      if (records.length < maxRecords) {
        records.push({
          userId: user.id,
          email: user.email,
          issue: 'Active user has no effective permissions',
        });
      }
    }
  }

  const [inactiveMembers] = await sequelize
    .query(
      `SELECT cu.user_id AS userId, cu.company_id AS companyId
     FROM company_users cu
     INNER JOIN users u ON u.id = cu.user_id
     WHERE u.is_active = 0`
    )
    .catch(() => [[]]);

  for (const row of inactiveMembers) {
    total += 1;
    breakdown.inactiveAssignments += 1;
    if (records.length < maxRecords) {
      records.push({ ...row, issue: 'Inactive user still assigned to company' });
    }
  }

  const [inactiveCoAssign] = await sequelize
    .query(
      `SELECT cu.user_id AS userId, cu.company_id AS companyId
     FROM company_users cu
     INNER JOIN company_settings cs ON cs.id = cu.company_id
     WHERE cs.is_active = 0`
    )
    .catch(() => [[]]);

  for (const row of inactiveCoAssign) {
    total += 1;
    breakdown.inactiveCompany += 1;
    if (records.length < maxRecords) {
      records.push({ ...row, issue: 'User assigned to inactive company' });
    }
  }

  for (const user of activeUsers) {
    const roleKey = normalizeLegacyRole(user.role);
    if (!roleKey || !FINANCE_ROLE_KEYS.includes(roleKey)) continue;

    const expected = SYSTEM_ROLE_PERMISSIONS[roleKey];
    if (!Array.isArray(expected) || expected.length === 0) continue;

    const { permissions } = await getUserEffectivePermissions(user);
    const missing = expected.filter((c) => !permissions.includes(c));
    if (missing.length > expected.length * 0.5) {
      total += 1;
      breakdown.financeGap += 1;
      if (records.length < maxRecords) {
        records.push({
          userId: user.id,
          email: user.email,
          role: roleKey,
          issue: 'Finance role missing expected module permissions',
          missingCount: missing.length,
          expectedCount: expected.length,
        });
      }
    }
  }

  return makeFinding({
    category: 'Permission Issues',
    severity: total > 0 ? 'HIGH' : 'LOW',
    count: total,
    records: records.slice(0, maxRecords),
    auditCode: AUDIT_CODE,
    summary: breakdown,
  });
}

module.exports = {
  AUDIT_CODE,
  runPermissionAudit,
};
