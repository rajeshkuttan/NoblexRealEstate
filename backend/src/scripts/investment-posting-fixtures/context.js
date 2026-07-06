'use strict';

const { CompanySetting, User } = require('../../models');

async function buildPostingContext() {
  const company = await CompanySetting.findOne({ where: { isActive: true }, order: [['id', 'ASC']] });
  if (!company) throw new Error('No active company');
  const user = await User.findOne({ where: { isActive: true }, order: [['id', 'ASC']] });
  if (!user) throw new Error('No active user');

  const req = {
    companyId: company.id,
    company,
    user,
    userRoles: ['admin'],
    userPermissions: [
      'module:investment:view', 'module:investment:create', 'module:investment:update',
      'module:investment:approve', 'module:investment:post', 'module:investment:valuation',
    ],
    headers: {},
  };
  return { companyId: company.id, userId: user.id, req };
}

module.exports = { buildPostingContext };
