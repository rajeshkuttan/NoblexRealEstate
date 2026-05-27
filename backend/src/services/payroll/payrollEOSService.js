const { Op } = require('sequelize');
const { PayrollEosConfiguration, PayrollEosRuleTier } = require('../../models');
const {
  monthsOfService,
  yearsOfService,
  getEosMonthlyAmount,
  dailySalary,
  round2,
} = require('./payrollSettlementUtils');

async function resolveEosConfiguration(companyId, contractType) {
  const configs = await PayrollEosConfiguration.findAll({
    where: { companyId, active: true },
    include: [{ model: PayrollEosRuleTier, as: 'tiers' }],
    order: [['id', 'DESC']],
  });

  const empContract = contractType || 'UNLIMITED';
  return (
    configs.find((c) => c.contractType === empContract) ||
    configs.find((c) => c.contractType === 'ALL') ||
    configs[0] ||
    null
  );
}

function tierApplies(tier, separationType) {
  const types = tier.appliesToSeparationTypes;
  if (!types || !Array.isArray(types) || types.length === 0) return true;
  return types.includes(separationType);
}

function calculateRuleBasedGratuity(config, serviceYears, basicMonthly, separationType) {
  const tiers = (config.tiers || []).filter((t) => tierApplies(t, separationType));
  let gratuity = 0;
  const tierDetails = [];

  for (const tier of tiers.sort((a, b) => Number(a.serviceYearsFrom) - Number(b.serviceYearsFrom))) {
    const from = Number(tier.serviceYearsFrom || 0);
    const to = tier.serviceYearsTo != null ? Number(tier.serviceYearsTo) : serviceYears;
    if (serviceYears < from) continue;

    const yearsInTier = Math.min(serviceYears, to) - from;
    if (yearsInTier <= 0) continue;

    let tierAmount = 0;
    if (tier.gratuityDaysPerYear != null) {
      const days = Number(tier.gratuityDaysPerYear) * yearsInTier;
      tierAmount = dailySalary(basicMonthly) * days;
    } else if (tier.percentOfBasic != null) {
      tierAmount = basicMonthly * (Number(tier.percentOfBasic) / 100) * yearsInTier;
    }

    gratuity += tierAmount;
    tierDetails.push({ tier_id: tier.id, years_in_tier: yearsInTier, amount: round2(tierAmount) });
  }

  return { amount: round2(gratuity), tierDetails };
}

async function calculateEOS({
  companyId,
  employee,
  separation,
  salaryStructure,
}) {
  const joiningDate = employee.joiningDate;
  const lastWorkingDay = separation.lastWorkingDay;
  const serviceMonths = monthsOfService(joiningDate, lastWorkingDay);
  const serviceYears = yearsOfService(joiningDate, lastWorkingDay);
  const basicMonthly = getEosMonthlyAmount(salaryStructure);

  const config = await resolveEosConfiguration(companyId, employee.contractType);
  if (!config) {
    return {
      amount: 0,
      eligible: false,
      reason: 'No active EOS configuration',
      serviceMonths,
      serviceYears,
      basicMonthly,
    };
  }

  if (serviceMonths < Number(config.minimumServiceMonths || 0)) {
    return {
      amount: 0,
      eligible: false,
      reason: 'Minimum service not met',
      serviceMonths,
      serviceYears,
      basicMonthly,
      config_id: config.id,
    };
  }

  let amount = 0;
  let calculationDetail = {};

  if (config.gratuityFormulaType === 'FIXED') {
    const days = Number(config.fixedGratuityDays || 0);
    const rate = config.fixedGratuityRate != null ? Number(config.fixedGratuityRate) : dailySalary(basicMonthly);
    amount = round2(days * rate * serviceYears);
    calculationDetail = { formula: 'FIXED', days, rate, serviceYears };
  } else {
    const result = calculateRuleBasedGratuity(
      config,
      serviceYears,
      basicMonthly,
      separation.separationType
    );
    amount = result.amount;
    calculationDetail = { formula: 'RULE_BASED', tiers: result.tierDetails, serviceYears };
  }

  return {
    amount,
    eligible: true,
    serviceMonths,
    serviceYears,
    basicMonthly,
    config_id: config.id,
    calculationDetail,
  };
}

module.exports = { calculateEOS, resolveEosConfiguration, calculateRuleBasedGratuity };
