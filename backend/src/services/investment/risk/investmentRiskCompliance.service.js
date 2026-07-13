'use strict';

const {
  sequelize,
  InvestmentMandate,
  InvestmentRiskLimit,
  InvestmentRiskBreach,
  InvestmentComplianceCheck,
  InvestmentPortfolio,
  InvestmentHoldingV2,
  InvestmentInstrument,
  InvestmentInvestor,
  InvestmentOrder,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const {
  parseJsonField,
  computeExposures,
  liquidityProfile,
  evaluateLimitsAgainstExposures,
  isMandateEffective,
  runPreTradeChecks,
  canOverrideBreach,
  assertOverrideReason,
  kycExpiringSoon,
  complianceCheckExpired,
  summarizeRiskDashboard,
  canTransitionMandate,
  investorAllocationAllowed,
  round2,
} = require('./riskEngine.service');
const { Op } = require('sequelize');

function jsonOrNull(v) {
  if (v == null) return null;
  return typeof v === 'string' ? v : JSON.stringify(v);
}

async function nextCode(Model, companyId, prefix) {
  const count = await Model.count({ where: { companyId } });
  return `${prefix}-${String(count + 1).padStart(6, '0')}`;
}

// ——— Mandates ———
async function listMandates(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.status) where.status = req.query.status;
  const { count, rows } = await InvestmentMandate.findAndCountAll({
    where,
    include: [{ model: InvestmentPortfolio, as: 'portfolio', attributes: ['id', 'portfolioCode', 'portfolioName'] }],
    order: [['effectiveFrom', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  });
  return { mandates: rows, pagination: paginationMeta(count, page, limit) };
}

async function getMandate(req, id) {
  const row = await InvestmentMandate.findOne({
    where: { id, ...companyWhere(req) },
    include: [{ model: InvestmentPortfolio, as: 'portfolio' }],
  });
  if (!row) {
    const err = new Error('Mandate not found');
    err.statusCode = 404;
    throw err;
  }
  return row;
}

async function createMandate(req, data) {
  if (!data.name || !data.effectiveFrom) {
    const err = new Error('name and effectiveFrom required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentMandate.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId || null,
      mandateCode: data.mandateCode || (await nextCode(InvestmentMandate, req.companyId, 'MND')),
      name: data.name,
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || null,
      allowedAssetClassesJson: jsonOrNull(data.allowedAssetClasses),
      prohibitedAssetClassesJson: jsonOrNull(data.prohibitedAssetClasses),
      targetAllocationJson: jsonOrNull(data.targetAllocation),
      concentrationLimitsJson: jsonOrNull(data.concentrationLimits),
      liquidityLimitsJson: jsonOrNull(data.liquidityLimits),
      currencyLimitsJson: jsonOrNull(data.currencyLimits),
      countryLimitsJson: jsonOrNull(data.countryLimits),
      issuerLimitsJson: jsonOrNull(data.issuerLimits),
      status: data.status || 'DRAFT',
      isTestData: !!data.isTestData,
    })
  );
}

async function updateMandate(req, id, data) {
  const row = await getMandate(req, id);
  const fields = [
    'name', 'effectiveFrom', 'effectiveTo', 'portfolioId', 'status',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) row[f] = data[f];
  }
  if (data.allowedAssetClasses !== undefined) row.allowedAssetClassesJson = jsonOrNull(data.allowedAssetClasses);
  if (data.prohibitedAssetClasses !== undefined) {
    row.prohibitedAssetClassesJson = jsonOrNull(data.prohibitedAssetClasses);
  }
  if (data.targetAllocation !== undefined) row.targetAllocationJson = jsonOrNull(data.targetAllocation);
  if (data.concentrationLimits !== undefined) {
    row.concentrationLimitsJson = jsonOrNull(data.concentrationLimits);
  }
  if (data.status && data.status !== row.status && !canTransitionMandate(row.status, data.status)) {
    // already assigned above — re-check from DB status
  }
  await row.save();
  return row;
}

async function activateMandate(req, id) {
  const row = await getMandate(req, id);
  if (!canTransitionMandate(row.status, 'ACTIVE')) {
    const err = new Error(`Cannot activate from ${row.status}`);
    err.statusCode = 400;
    throw err;
  }
  row.status = 'ACTIVE';
  await row.save();
  return row;
}

// ——— Risk limits ———
async function listRiskLimits(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.limitType) where.limitType = req.query.limitType;
  if (req.query.status) where.status = req.query.status;
  const rows = await InvestmentRiskLimit.findAll({ where, order: [['id', 'DESC']] });
  return { limits: rows };
}

async function createRiskLimit(req, data) {
  if (!data.limitType || !data.effectiveFrom) {
    const err = new Error('limitType and effectiveFrom required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentRiskLimit.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId || null,
      limitCode: data.limitCode || (await nextCode(InvestmentRiskLimit, req.companyId, 'LMT')),
      limitType: data.limitType,
      dimension: data.dimension || null,
      thresholdWarning: data.thresholdWarning != null ? data.thresholdWarning : 0,
      thresholdBreach: data.thresholdBreach != null ? data.thresholdBreach : 0,
      measurementBasis: data.measurementBasis || 'PERCENT_NAV',
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || null,
      status: data.status || 'ACTIVE',
      isTestData: !!data.isTestData,
    })
  );
}

// ——— Breaches ———
async function listBreaches(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.portfolioId) where.portfolioId = Number(req.query.portfolioId);
  if (req.query.status) where.status = req.query.status;
  if (req.query.severity) where.severity = req.query.severity;
  const rows = await InvestmentRiskBreach.findAll({
    where,
    include: [{ model: InvestmentRiskLimit, as: 'limit' }],
    order: [['detectedAt', 'DESC']],
  });
  return { breaches: rows };
}

async function createBreach(req, data) {
  return InvestmentRiskBreach.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId || null,
      limitId: data.limitId || null,
      mandateId: data.mandateId || null,
      breachNumber: data.breachNumber || (await nextCode(InvestmentRiskBreach, req.companyId, 'BRC')),
      detectedAt: data.detectedAt || new Date(),
      actualValue: data.actualValue || 0,
      limitValue: data.limitValue || 0,
      severity: data.severity || 'BREACH',
      status: 'OPEN',
      dimensionKey: data.dimensionKey || null,
      remediationPlan: data.remediationPlan || null,
      isTestData: !!data.isTestData,
    })
  );
}

async function overrideBreach(req, id, data = {}) {
  const breach = await InvestmentRiskBreach.findOne({ where: { id, ...companyWhere(req) } });
  if (!breach) {
    const err = new Error('Breach not found');
    err.statusCode = 404;
    throw err;
  }
  const toStatus = data.status || 'EXCEPTION_APPROVED';
  if (!canOverrideBreach(breach.status, toStatus)) {
    const err = new Error(`Cannot move breach from ${breach.status} to ${toStatus}`);
    err.statusCode = 400;
    throw err;
  }
  if (toStatus === 'EXCEPTION_APPROVED') {
    assertOverrideReason(data.reason || data.overrideReason);
    breach.overrideReason = data.reason || data.overrideReason;
    breach.approvedExceptionBy = req.user?.id || null;
  }
  if (data.remediationPlan) breach.remediationPlan = data.remediationPlan;
  breach.status = toStatus;
  if (['REMEDIATED', 'CLOSED'].includes(toStatus)) breach.resolvedAt = new Date();
  await breach.save();
  return breach;
}

async function buildHoldingsExposure(req, portfolioId) {
  const where = { ...companyWhere(req) };
  if (portfolioId) where.portfolioId = portfolioId;
  const holdings = await InvestmentHoldingV2.findAll({
    where,
    include: [{ model: InvestmentInstrument, as: 'instrument' }],
    limit: 500,
  });
  const rows = holdings.map((h) => ({
    marketValue: Number(h.currentMarketValue || 0),
    instrumentId: h.instrumentId,
    assetClass: h.instrument?.assetClass,
    currencyCode: h.instrument?.currencyCode || h.currencyCode,
    countryCode: h.instrument?.countryCode,
    sectorCode: h.instrument?.sectorCode,
    issuerName: h.instrument?.issuerName,
    maturityDate: h.instrument?.maturityDate,
  }));
  return { holdings: rows, exposures: computeExposures(rows), liquidity: liquidityProfile(rows) };
}

async function runLimitScan(req, data = {}) {
  const portfolioId = data.portfolioId ? Number(data.portfolioId) : null;
  const { exposures, liquidity, holdings } = await buildHoldingsExposure(req, portfolioId);
  const limitWhere = { ...companyWhere(req), status: 'ACTIVE' };
  if (portfolioId) {
    limitWhere[Op.or] = [{ portfolioId }, { portfolioId: null }];
  }
  const limits = await InvestmentRiskLimit.findAll({ where: limitWhere });
  const results = evaluateLimitsAgainstExposures(limits, exposures);
  const created = [];
  if (data.persist !== false) {
    for (const r of results.filter((x) => x.breached && x.severity !== 'WARNING')) {
      const existing = await InvestmentRiskBreach.findOne({
        where: {
          ...companyWhere(req),
          limitId: r.limitId,
          dimensionKey: r.dimensionKey,
          status: { [Op.in]: ['OPEN', 'UNDER_REVIEW'] },
        },
      });
      if (existing) continue;
      created.push(
        await createBreach(req, {
          portfolioId,
          limitId: r.limitId,
          actualValue: r.actualValue,
          limitValue: r.limitValue,
          severity: r.severity,
          dimensionKey: r.dimensionKey,
          isTestData: !!data.isTestData,
        })
      );
    }
  }
  return { exposures, liquidity, holdingsCount: holdings.length, evaluations: results, breachesCreated: created };
}

async function getRiskDashboard(req) {
  const portfolioId = req.query.portfolioId ? Number(req.query.portfolioId) : null;
  const { exposures, liquidity } = await buildHoldingsExposure(req, portfolioId);
  const breachWhere = { ...companyWhere(req), ...testDataWhere(req) };
  if (portfolioId) breachWhere.portfolioId = portfolioId;
  const breaches = await InvestmentRiskBreach.findAll({
    where: breachWhere,
    order: [['detectedAt', 'DESC']],
    limit: 50,
  });
  const investors = await InvestmentInvestor.findAll({
    where: { ...companyWhere(req), status: 'ACTIVE' },
    limit: 200,
  });
  const kycExpiries = investors
    .filter((i) => kycExpiringSoon(i) || (i.kycExpiryDate && String(i.kycExpiryDate) < new Date().toISOString().slice(0, 10)))
    .map((i) => ({
      investorId: i.id,
      legalName: i.legalName,
      kycStatus: i.kycStatus,
      kycExpiryDate: i.kycExpiryDate,
    }));
  const staleValuations = (await InvestmentHoldingV2.findAll({
    where: {
      ...companyWhere(req),
      ...(portfolioId ? { portfolioId } : {}),
      [Op.or]: [
        { lastValuationDate: null },
        { lastValuationDate: { [Op.lt]: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10) } },
      ],
    },
    limit: 50,
  })).map((h) => ({
    holdingId: h.id,
    instrumentId: h.instrumentId,
    lastValuationDate: h.lastValuationDate,
  }));

  return summarizeRiskDashboard({
    exposures,
    breaches: breaches.map((b) => b.toJSON()),
    kycExpiries,
    staleValuations,
    liquidity,
  });
}

// ——— Compliance checks ———
async function listComplianceChecks(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.investorId) where.investorId = Number(req.query.investorId);
  if (req.query.instrumentId) where.instrumentId = Number(req.query.instrumentId);
  if (req.query.checkType) where.checkType = req.query.checkType;
  if (req.query.status) where.status = req.query.status;
  const rows = await InvestmentComplianceCheck.findAll({ where, order: [['id', 'DESC']], limit: 200 });
  return {
    checks: rows.map((r) => ({
      ...r.toJSON(),
      expired: complianceCheckExpired(r),
    })),
  };
}

async function createComplianceCheck(req, data) {
  if (!data.checkType) {
    const err = new Error('checkType required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentComplianceCheck.create(
    withCompanyId(req, {
      investorId: data.investorId || null,
      instrumentId: data.instrumentId || null,
      portfolioId: data.portfolioId || null,
      checkType: data.checkType,
      status: data.status || 'PENDING',
      checkedAt: data.checkedAt || new Date(),
      expiryDate: data.expiryDate || null,
      resultJson: jsonOrNull(data.result),
      providerRef: data.providerRef || null,
      reviewedBy: req.user?.id || null,
      remarks: data.remarks || null,
      isTestData: !!data.isTestData,
    })
  );
}

async function updateComplianceCheck(req, id, data = {}) {
  const row = await InvestmentComplianceCheck.findOne({ where: { id, ...companyWhere(req) } });
  if (!row) {
    const err = new Error('Compliance check not found');
    err.statusCode = 404;
    throw err;
  }
  if (data.status) row.status = data.status;
  if (data.expiryDate !== undefined) row.expiryDate = data.expiryDate;
  if (data.result !== undefined) row.resultJson = jsonOrNull(data.result);
  if (data.providerRef !== undefined) row.providerRef = data.providerRef;
  if (data.remarks !== undefined) row.remarks = data.remarks;
  row.reviewedBy = req.user?.id || row.reviewedBy;
  row.checkedAt = new Date();
  await row.save();
  return row;
}

async function updateInvestorCompliance(req, investorId, data = {}) {
  const investor = await InvestmentInvestor.findOne({ where: { id: investorId, ...companyWhere(req) } });
  if (!investor) {
    const err = new Error('Investor not found');
    err.statusCode = 404;
    throw err;
  }
  const fields = [
    'kycStatus', 'amlRiskRating', 'uboStatus', 'sourceOfFundsStatus',
    'kycExpiryDate', 'kycReviewDate', 'sanctionsResultRef', 'complianceApprovalStatus',
  ];
  for (const f of fields) {
    if (data[f] !== undefined) investor[f] = data[f];
  }
  await investor.save();
  return investor;
}

async function checkInvestorForAllocation(req, investorId) {
  const investor = await InvestmentInvestor.findOne({ where: { id: investorId, ...companyWhere(req) } });
  if (!investor) {
    const err = new Error('Investor not found');
    err.statusCode = 404;
    throw err;
  }
  return { investor, ...investorAllocationAllowed(investor) };
}

async function previewPreTrade(req, data = {}) {
  const portfolioId = data.portfolioId ? Number(data.portfolioId) : null;
  const instrumentId = data.instrumentId ? Number(data.instrumentId) : null;
  let instrument = null;
  if (instrumentId) {
    instrument = await InvestmentInstrument.findOne({ where: { id: instrumentId, ...companyWhere(req) } });
  }
  let mandate = null;
  if (portfolioId) {
    const mandates = await InvestmentMandate.findAll({
      where: {
        ...companyWhere(req),
        status: 'ACTIVE',
        [Op.or]: [{ portfolioId }, { portfolioId: null }],
      },
      order: [['effectiveFrom', 'DESC']],
    });
    mandate = mandates.find((m) => isMandateEffective(m, data.asOf)) || null;
  }
  const { exposures } = await buildHoldingsExposure(req, portfolioId);
  const limits = await InvestmentRiskLimit.findAll({
    where: {
      ...companyWhere(req),
      status: 'ACTIVE',
      ...(portfolioId ? { [Op.or]: [{ portfolioId }, { portfolioId: null }] } : {}),
    },
  });
  let investor = null;
  if (data.investorId) {
    investor = await InvestmentInvestor.findOne({ where: { id: data.investorId, ...companyWhere(req) } });
  }
  return runPreTradeChecks({
    order: data.order || data,
    instrument: instrument ? instrument.toJSON() : data.instrument || {},
    mandate: mandate ? mandate.toJSON() : null,
    limits: limits.map((l) => l.toJSON()),
    exposures,
    cashAvailable: data.cashAvailable,
    investor: investor ? investor.toJSON() : null,
    restricted: data.restricted,
    requireMandate: !!data.requireMandate,
    blockedCounterparties: data.blockedCounterparties || [],
    relatedPartyNeedsApproval: !!data.relatedPartyNeedsApproval,
    relatedPartyApproved: !!data.relatedPartyApproved,
    asOf: data.asOf,
  });
}

async function assertOrderPreTrade(req, order) {
  const result = await previewPreTrade(req, {
    portfolioId: order.portfolioId,
    instrumentId: order.instrumentId,
    order: {
      quantity: order.quantity,
      limitPrice: order.limitPrice || order.price,
      side: order.side || order.orderSide,
      brokerId: order.brokerId,
      orderDate: order.orderDate,
      estimatedNotional: order.estimatedNotional,
    },
    cashAvailable: order.cashAvailable,
    requireMandate: false,
  });
  if (!result.passed) {
    const err = new Error(`Pre-trade compliance failed: ${result.failures.map((f) => f.code).join(', ')}`);
    err.statusCode = 400;
    err.code = 'PRE_TRADE_FAILED';
    err.details = result;
    throw err;
  }
  await InvestmentComplianceCheck.create(
    withCompanyId(req, {
      instrumentId: order.instrumentId || null,
      portfolioId: order.portfolioId || null,
      checkType: 'PRE_TRADE',
      status: 'PASS',
      checkedAt: new Date(),
      resultJson: JSON.stringify(result),
      reviewedBy: req.user?.id || null,
    })
  );
  return result;
}

module.exports = {
  listMandates,
  getMandate,
  createMandate,
  updateMandate,
  activateMandate,
  listRiskLimits,
  createRiskLimit,
  listBreaches,
  createBreach,
  overrideBreach,
  runLimitScan,
  getRiskDashboard,
  listComplianceChecks,
  createComplianceCheck,
  updateComplianceCheck,
  updateInvestorCompliance,
  checkInvestorForAllocation,
  previewPreTrade,
  assertOrderPreTrade,
  buildHoldingsExposure,
};
