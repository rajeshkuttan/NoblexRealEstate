'use strict';

const {
  InvestmentPortfolio,
  InvestmentBook,
  InvestmentBroker,
  InvestmentCustodian,
  InvestmentHoldingV2,
  InvestmentInstrument,
  InvestmentTransaction,
  InvestmentAsset,
} = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const { Op } = require('sequelize');

async function listPortfolios(req) {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.status) where.status = req.query.status;
  if (req.query.search) {
    where[Op.or] = [
      { portfolioName: { [Op.like]: `%${req.query.search}%` } },
      { portfolioCode: { [Op.like]: `%${req.query.search}%` } },
    ];
  }
  const { count, rows } = await InvestmentPortfolio.findAndCountAll({
    where,
    include: [{ model: InvestmentBook, as: 'books' }],
    order: [['portfolioName', 'ASC']],
    limit,
    offset,
  });
  return { portfolios: rows, pagination: paginationMeta(count, page, limit) };
}

async function getPortfolio360(req, portfolioId) {
  const portfolio = await InvestmentPortfolio.findOne({
    where: { id: portfolioId, ...companyWhere(req) },
    include: [
      { model: InvestmentBook, as: 'books' },
      { model: InvestmentBroker, as: 'defaultBroker' },
      { model: InvestmentCustodian, as: 'custodian' },
    ],
  });
  if (!portfolio) {
    const err = new Error('Portfolio not found');
    err.statusCode = 404;
    throw err;
  }
  const holdings = await InvestmentHoldingV2.findAll({
    where: { portfolioId, ...companyWhere(req) },
    include: [{ model: InvestmentInstrument, as: 'instrument' }],
  });
  let totalCost = 0;
  let marketValue = 0;
  for (const h of holdings) {
    totalCost += Number(h.totalCost || 0);
    marketValue += Number(h.currentMarketValue || 0);
  }
  const legacyAssetIds = holdings.map((h) => h.legacyAssetId).filter(Boolean);
  const recentTxns =
    legacyAssetIds.length > 0
      ? await InvestmentTransaction.findAll({
          where: {
            ...companyWhere(req),
            investmentAssetId: { [Op.in]: legacyAssetIds },
          },
          include: [{ model: InvestmentAsset, as: 'asset', attributes: ['investmentCode', 'investmentName'] }],
          order: [['transactionDate', 'DESC']],
          limit: 20,
        })
      : [];

  return {
    portfolio,
    summary: {
      holdingCount: holdings.length,
      totalCost,
      marketValue,
      unrealizedGainLoss: marketValue - totalCost,
    },
    holdings,
    recentTransactions: recentTxns,
  };
}

async function createPortfolio(req, data) {
  const code = data.portfolioCode || `PF-${Date.now().toString().slice(-6)}`;
  const portfolio = await InvestmentPortfolio.create(
    withCompanyId(req, {
      portfolioCode: code,
      portfolioName: data.portfolioName || 'Portfolio',
      reportingCurrency: data.reportingCurrency || 'AED',
      baseCurrency: data.baseCurrency || 'AED',
      portfolioType: data.portfolioType || 'GENERAL',
      riskProfile: data.riskProfile || 'MEDIUM',
      inceptionDate: data.inceptionDate || null,
      status: data.status || 'ACTIVE',
      custodianId: data.custodianId || null,
      defaultBrokerId: data.defaultBrokerId || null,
      defaultBankAccountId: data.defaultBankAccountId || null,
      accountingMethod: data.accountingMethod || 'COST',
      costBasisMethod: data.costBasisMethod || 'AVERAGE',
      description: data.description || null,
      isTestData: !!data.isTestData,
    })
  );
  await InvestmentBook.create(
    withCompanyId(req, {
      portfolioId: portfolio.id,
      bookCode: 'MAIN',
      bookName: 'Main Book',
      bookType: 'TRADING',
      accountingBasis: data.accountingMethod || 'COST',
      reportingCurrency: data.reportingCurrency || 'AED',
      status: 'ACTIVE',
    })
  );
  return getPortfolio360(req, portfolio.id);
}

async function updatePortfolio(req, portfolioId, data) {
  const portfolio = await InvestmentPortfolio.findOne({
    where: { id: portfolioId, ...companyWhere(req) },
  });
  if (!portfolio) {
    const err = new Error('Portfolio not found');
    err.statusCode = 404;
    throw err;
  }
  const allowed = [
    'portfolioName',
    'reportingCurrency',
    'baseCurrency',
    'portfolioType',
    'riskProfile',
    'inceptionDate',
    'closeDate',
    'status',
    'custodianId',
    'defaultBrokerId',
    'defaultBankAccountId',
    'accountingMethod',
    'costBasisMethod',
    'description',
    'isTestData',
  ];
  const updates = {};
  for (const k of allowed) {
    if (data[k] !== undefined) updates[k] = data[k];
  }
  await portfolio.update(updates);
  return getPortfolio360(req, portfolioId);
}

module.exports = {
  listPortfolios,
  getPortfolio360,
  createPortfolio,
  updatePortfolio,
};
