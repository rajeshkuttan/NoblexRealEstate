const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { CompanySetting, CompanyUser, User } = require('../models');

const COMPANY_HEADER = 'x-company-id';

function parseHeaderCompanyId(headerValue) {
  if (headerValue == null || headerValue === '') return null;
  const id = parseInt(String(headerValue), 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function getUserCompanies(userId) {
  const memberships = await CompanyUser.findAll({
    where: { userId, isActive: true },
    include: [
      {
        model: CompanySetting,
        as: 'companySetting',
        where: { isActive: true },
        required: true,
      },
    ],
    order: [
      ['isDefault', 'DESC'],
      [{ model: CompanySetting, as: 'companySetting' }, 'companyName', 'ASC'],
    ],
  });

  return memberships.map((m) => {
    const c = m.companySetting;
    return {
      id: c.id,
      company_name: c.companyName,
      company_name_arabic: c.companyNameArabic,
      logo: c.logo,
      is_default: m.isDefault,
      is_active: c.isActive,
      currency: c.currency,
      timezone: c.timezone,
      vat_number: c.vatNumber,
      role_in_company: m.roleInCompany,
    };
  });
}

async function countActiveCompanies() {
  return CompanySetting.count({ where: { isActive: true } });
}

async function countUserActiveMemberships(userId) {
  return CompanyUser.count({
    where: { userId, isActive: true },
    include: [
      {
        model: CompanySetting,
        as: 'companySetting',
        where: { isActive: true },
        required: true,
      },
    ],
  });
}

async function verifyUserCompanyAccess(userId, companyId) {
  const membership = await CompanyUser.findOne({
    where: { userId, companyId, isActive: true },
    include: [
      {
        model: CompanySetting,
        as: 'companySetting',
        where: { isActive: true },
        required: true,
      },
    ],
  });
  return membership;
}

async function resolveActiveCompany(userId, headerCompanyId) {
  const companies = await getUserCompanies(userId);
  if (companies.length === 0) {
    const err = new Error('No company access assigned to user');
    err.statusCode = 403;
    throw err;
  }

  if (headerCompanyId != null) {
    const match = companies.find((c) => c.id === headerCompanyId);
    if (!match) {
      const err = new Error('Company access denied');
      err.statusCode = 403;
      err.requestedCompanyId = headerCompanyId;
      throw err;
    }
    const membership = await verifyUserCompanyAccess(userId, headerCompanyId);
    return { companyId: headerCompanyId, company: membership.companySetting };
  }

  const defaultRow = companies.find((c) => c.is_default);
  if (defaultRow) {
    const membership = await verifyUserCompanyAccess(userId, defaultRow.id);
    return { companyId: defaultRow.id, company: membership.companySetting };
  }

  if (companies.length === 1) {
    const membership = await verifyUserCompanyAccess(userId, companies[0].id);
    return { companyId: companies[0].id, company: membership.companySetting };
  }

  const err = new Error('Company selection required');
  err.statusCode = 400;
  throw err;
}

async function setUserDefaultCompany(userId, companyId) {
  const membership = await CompanyUser.findOne({
    where: { userId, companyId },
    include: [{ model: CompanySetting, as: 'companySetting', required: true }],
  });
  if (!membership || !membership.isActive) {
    const err = new Error('Cannot set default on inactive company assignment');
    err.statusCode = 400;
    throw err;
  }
  if (!membership.companySetting.isActive) {
    const err = new Error('Cannot set default on inactive company');
    err.statusCode = 400;
    throw err;
  }

  await sequelize.transaction(async (transaction) => {
    await CompanyUser.update(
      { isDefault: false },
      { where: { userId }, transaction }
    );
    await CompanyUser.update(
      { isDefault: true },
      { where: { userId, companyId }, transaction }
    );
  });

  return membership;
}

async function setUserDefaultCompanyForCompany(companyId, userId) {
  return setUserDefaultCompany(userId, companyId);
}

async function resolveCompanyForLegacySettings(userId, headerCompanyId) {
  try {
    return await resolveActiveCompany(userId, headerCompanyId);
  } catch (e) {
    if (e.statusCode === 400) {
      const first = await CompanySetting.findOne({
        where: { isActive: true },
        order: [['id', 'ASC']],
      });
      if (first) {
        return { companyId: first.id, company: first };
      }
    }
    throw e;
  }
}

async function assertCanDeactivateCompany(companyId, options = {}) {
  const { actorUserId, actorActiveCompanyId } = options;
  const company = await CompanySetting.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }
  if (!company.isActive) {
    return company;
  }

  const activeCount = await countActiveCompanies();
  if (activeCount <= 1) {
    const err = new Error('Cannot deactivate the last active company in the system.');
    err.statusCode = 400;
    throw err;
  }

  if (actorActiveCompanyId != null && Number(actorActiveCompanyId) === Number(companyId)) {
    const err = new Error('Cannot deactivate your currently active company. Switch to another company first.');
    err.statusCode = 400;
    throw err;
  }

  const soleUserRows = await sequelize.query(
    `SELECT cu.user_id AS userId
     FROM company_users cu
     INNER JOIN company_settings cs ON cs.id = cu.company_id AND cs.is_active = 1
     WHERE cu.is_active = 1
     GROUP BY cu.user_id
     HAVING COUNT(DISTINCT cu.company_id) = 1
       AND MAX(cu.company_id) = :companyId`,
    {
      replacements: { companyId },
      type: sequelize.QueryTypes.SELECT,
    }
  );

  if (soleUserRows.length > 0) {
    const err = new Error(
      'Cannot deactivate this company because it is the only active company for one or more users.'
    );
    err.statusCode = 400;
    throw err;
  }

  return company;
}

async function assertCanRemoveUserFromCompany(companyId, userId, options = {}) {
  const { actorUserId, actorActiveCompanyId } = options;

  if (
    actorUserId != null &&
    Number(actorUserId) === Number(userId) &&
    actorActiveCompanyId != null &&
    Number(actorActiveCompanyId) === Number(companyId)
  ) {
    const err = new Error('Cannot remove yourself from your currently active company.');
    err.statusCode = 400;
    throw err;
  }

  const activeMemberships = await countUserActiveMemberships(userId);
  const membership = await CompanyUser.findOne({ where: { companyId, userId } });
  if (!membership) {
    const err = new Error('Company user assignment not found');
    err.statusCode = 404;
    throw err;
  }

  if (membership.isActive && activeMemberships <= 1) {
    const err = new Error('Cannot remove the user\'s last active company assignment.');
    err.statusCode = 400;
    throw err;
  }
}

async function assignUserToCompany(companyId, userId, options = {}) {
  const company = await CompanySetting.findByPk(companyId);
  if (!company) {
    const err = new Error('Company not found');
    err.statusCode = 404;
    throw err;
  }
  if (!company.isActive) {
    const err = new Error('Cannot assign users to an inactive company');
    err.statusCode = 400;
    throw err;
  }
  const user = await User.findByPk(userId);
  if (!user) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  const [membership, created] = await CompanyUser.findOrCreate({
    where: { companyId, userId },
    defaults: {
      roleInCompany: options.roleInCompany || null,
      isDefault: !!options.isDefault,
      isActive: options.isActive !== false,
    },
  });

  if (!created) {
    const updates = {
      roleInCompany: options.roleInCompany ?? membership.roleInCompany,
    };
    if (options.isActive !== false) {
      updates.isActive = true;
    } else if (options.isActive === false) {
      await assertCanRemoveUserFromCompany(companyId, userId, {
        actorUserId: options.actorUserId,
        actorActiveCompanyId: options.actorActiveCompanyId,
      });
      updates.isActive = false;
    }
    await membership.update(updates);
  }

  if (options.isDefault) {
    await setUserDefaultCompany(userId, companyId);
  }

  return membership;
}

async function removeUserFromCompany(companyId, userId, options = {}) {
  await assertCanRemoveUserFromCompany(companyId, userId, options);
  const deleted = await CompanyUser.destroy({ where: { companyId, userId } });
  if (!deleted) {
    const err = new Error('Company user assignment not found');
    err.statusCode = 404;
    throw err;
  }
}

async function listCompanyUsers(companyId) {
  return CompanyUser.findAll({
    where: { companyId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'role', 'isActive'] }],
    order: [['is_default', 'DESC'], ['created_at', 'ASC']],
  });
}

async function switchCompanyForUser(userId, companyId) {
  const membership = await verifyUserCompanyAccess(userId, companyId);
  if (!membership) {
    const err = new Error('Company access denied');
    err.statusCode = 403;
    throw err;
  }
  return membership.companySetting;
}

module.exports = {
  COMPANY_HEADER,
  parseHeaderCompanyId,
  getUserCompanies,
  verifyUserCompanyAccess,
  resolveActiveCompany,
  resolveCompanyForLegacySettings,
  setUserDefaultCompany,
  setUserDefaultCompanyForCompany,
  assertCanDeactivateCompany,
  assertCanRemoveUserFromCompany,
  assignUserToCompany,
  removeUserFromCompany,
  listCompanyUsers,
  switchCompanyForUser,
  countActiveCompanies,
};
