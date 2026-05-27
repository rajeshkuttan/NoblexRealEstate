const { sequelize } = require('../config/database');
const { User } = require('../models');
const { getUserEffectivePermissions } = require('./rbacService');
const { PERMISSION_DEFINITIONS } = require('../config/permissions');
const { makeFinding } = require('./dataIntegrityAudit.service');

const AUDIT_CODE = 'PERMISSION_AUDIT_FAILURE';

const FINANCE_MODULE_KEYS = [
  'finance',
  'vendors',
  'treasury',
  'chart_of_accounts',
  'journal_vouchers',
];

async function runPermissionAudit({ maxRecords = 50 } = {}) {
  const records = [];
  let total = 0;

  const activeUsers = await User.findAll({
    where: { isActive: true },
    attributes: ['id', 'email', 'role', 'isActive'],
  });

  for (const user of activeUsers) {
    const { permissions } = await getUserEffectivePermissions(user);
    if (!permissions || permissions.length === 0) {
      total += 1;
      if (records.length < maxRecords) {
        records.push({
          userId: user.id,
          email: user.email,
          issue: 'Active user has no effective permissions',
        });
      }
    }
  }

  const [inactiveMembers] = await sequelize.query(
    `SELECT cu.user_id AS userId, cu.company_id AS companyId
     FROM company_users cu
     INNER JOIN users u ON u.id = cu.user_id
     WHERE u.is_active = 0`
  ).catch(() => [[]]);

  for (const row of inactiveMembers) {
    total += 1;
    if (records.length < maxRecords) {
      records.push({ ...row, issue: 'Inactive user still assigned to company' });
    }
  }

  const [inactiveCoAssign] = await sequelize.query(
    `SELECT cu.user_id AS userId, cu.company_id AS companyId
     FROM company_users cu
     INNER JOIN company_settings cs ON cs.id = cu.company_id
     WHERE cs.is_active = 0`
  ).catch(() => [[]]);

  for (const row of inactiveCoAssign) {
    total += 1;
    if (records.length < maxRecords) {
      records.push({ ...row, issue: 'User assigned to inactive company' });
    }
  }

  const financePermCodes = PERMISSION_DEFINITIONS.filter((p) =>
    FINANCE_MODULE_KEYS.includes(p.module)
  ).map((p) => p.code);

  const financeRoles = ['finance_manager', 'finance_executive'];
  for (const user of activeUsers) {
    if (!financeRoles.includes(user.role)) continue;
    const { permissions } = await getUserEffectivePermissions(user);
    const missing = financePermCodes.filter((c) => !permissions.includes(c));
    if (missing.length > financePermCodes.length * 0.5) {
      total += 1;
      if (records.length < maxRecords) {
        records.push({
          userId: user.id,
          email: user.email,
          role: user.role,
          issue: 'Finance role missing expected module permissions',
          missingCount: missing.length,
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
  });
}

module.exports = {
  AUDIT_CODE,
  runPermissionAudit,
};
