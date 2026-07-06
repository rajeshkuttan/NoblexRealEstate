const { CompanySetting, CompanyUser, User } = require('../../models');
const { COMPANY_NAME_MATCH } = require('./constants');

function parseArgv(argv = process.argv.slice(2)) {
  const opts = {};
  for (const arg of argv) {
    if (arg.startsWith('--company-id=')) {
      opts.companyId = Number(arg.split('=')[1]);
    }
  }
  return opts;
}

async function resolveCompanyByName() {
  const rows = await CompanySetting.findAll();
  const matches = rows.filter((r) =>
    (r.companyName || '').toLowerCase().includes(COMPANY_NAME_MATCH)
  );
  if (matches.length === 0) {
    const err = new Error(
      `No company found with name containing "${COMPANY_NAME_MATCH}". Use --company-id=<id>.`
    );
    err.statusCode = 404;
    throw err;
  }
  if (matches.length > 1) {
    const err = new Error(
      `Ambiguous company match (${matches.length} candidates). Use --company-id=<id>.\n` +
        matches.map((m) => `  id=${m.id} name="${m.companyName}"`).join('\n')
    );
    err.statusCode = 400;
    throw err;
  }
  return matches[0];
}

async function resolveUserId(companyId) {
  const link = await CompanyUser.findOne({
    where: { companyId },
    order: [['id', 'ASC']],
  });
  if (link?.userId) return link.userId;
  const user = await User.findOne({ order: [['id', 'ASC']] });
  return user?.id || null;
}

async function buildContext(options = {}) {
  const argv = parseArgv(options.argv);
  let company;
  if (options.companyId || argv.companyId) {
    const id = options.companyId || argv.companyId;
    company = await CompanySetting.findByPk(id);
    if (!company) {
      const err = new Error(`Company not found: id=${id}`);
      err.statusCode = 404;
      throw err;
    }
  } else {
    try {
      company = await resolveCompanyByName();
    } catch (nameErr) {
      company = await CompanySetting.findOne({
        where: { isActive: true },
        order: [['id', 'ASC']],
      });
      if (!company) throw nameErr;
      console.warn(
        `[Payroll Full-Cycle] Company name match failed; using first active company id=${company.id}`
      );
    }
  }

  const userId = options.userId ?? (await resolveUserId(company.id));

  return {
    companyId: company.id,
    company,
    userId,
    handles: {},
    log: [],
  };
}

module.exports = {
  buildContext,
  parseArgv,
  resolveCompanyByName,
  resolveUserId,
};
