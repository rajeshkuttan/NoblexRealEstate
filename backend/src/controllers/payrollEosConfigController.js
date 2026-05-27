const { PayrollEosConfiguration, PayrollEosRuleTier } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
} = require('../utils/companyScope');

exports.list = async (req, res, next) => {
  try {
    const rows = await PayrollEosConfiguration.findAll({
      where: companyWhere(req),
      include: [{ model: PayrollEosRuleTier, as: 'tiers' }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const row = await PayrollEosConfiguration.create(
      withCompanyId(req, {
        ruleName: body.rule_name,
        contractType: body.contract_type || 'ALL',
        minimumServiceMonths: body.minimum_service_months ?? 0,
        gratuityFormulaType: body.gratuity_formula_type || 'RULE_BASED',
        dailySalaryBasis: body.daily_salary_basis || 'BASIC_DIV_30',
        fixedGratuityDays: body.fixed_gratuity_days,
        fixedGratuityRate: body.fixed_gratuity_rate,
        noticeRecoveryEnabled: body.notice_recovery_enabled !== false,
        active: body.active !== false,
      })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const row = await assertRecordInCompany(PayrollEosConfiguration, req.params.id, req);
    await row.update({
      ruleName: body.rule_name ?? row.ruleName,
      contractType: body.contract_type ?? row.contractType,
      minimumServiceMonths: body.minimum_service_months ?? row.minimumServiceMonths,
      gratuityFormulaType: body.gratuity_formula_type ?? row.gratuityFormulaType,
      dailySalaryBasis: body.daily_salary_basis ?? row.dailySalaryBasis,
      fixedGratuityDays: body.fixed_gratuity_days ?? row.fixedGratuityDays,
      fixedGratuityRate: body.fixed_gratuity_rate ?? row.fixedGratuityRate,
      noticeRecoveryEnabled: body.notice_recovery_enabled ?? row.noticeRecoveryEnabled,
      active: body.active ?? row.active,
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.listTiers = async (req, res, next) => {
  try {
    await assertRecordInCompany(PayrollEosConfiguration, req.params.id, req);
    const rows = await PayrollEosRuleTier.findAll({
      where: { companyId: req.companyId, eosConfigurationId: req.params.id },
      order: [['serviceYearsFrom', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.createTier = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await assertRecordInCompany(PayrollEosConfiguration, req.params.id, req);
    const row = await PayrollEosRuleTier.create(
      withCompanyId(req, {
        eosConfigurationId: Number(req.params.id),
        serviceYearsFrom: body.service_years_from ?? 0,
        serviceYearsTo: body.service_years_to,
        gratuityDaysPerYear: body.gratuity_days_per_year,
        percentOfBasic: body.percent_of_basic,
        appliesToSeparationTypes: body.applies_to_separation_types,
      })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.updateTier = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const row = await assertRecordInCompany(PayrollEosRuleTier, req.params.tierId, req);
    await row.update({
      serviceYearsFrom: body.service_years_from ?? row.serviceYearsFrom,
      serviceYearsTo: body.service_years_to ?? row.serviceYearsTo,
      gratuityDaysPerYear: body.gratuity_days_per_year ?? row.gratuityDaysPerYear,
      percentOfBasic: body.percent_of_basic ?? row.percentOfBasic,
      appliesToSeparationTypes: body.applies_to_separation_types ?? row.appliesToSeparationTypes,
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.removeTier = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollEosRuleTier, req.params.tierId, req);
    await row.destroy();
    res.json({ success: true });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
