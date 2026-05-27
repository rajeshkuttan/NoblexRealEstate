function assertSeedAllowed() {
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production' && process.env.ALLOW_PAYROLL_DEMO_SEED !== 'true') {
    const err = new Error(
      'Payroll demo seed blocked in production. Set ALLOW_PAYROLL_DEMO_SEED=true to override.'
    );
    err.statusCode = 403;
    throw err;
  }
}

function logCompanyBanner(company) {
  console.log(`\n[Payroll Full-Cycle] Company: ${company.companyName} (id=${company.id})\n`);
}

module.exports = {
  assertSeedAllowed,
  logCompanyBanner,
};
