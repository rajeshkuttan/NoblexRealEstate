'use strict';

const { InvestmentBroker, InvestmentCustodian, InvestmentAccount } = require('../../../models');
const { companyWhere, withCompanyId } = require('../../../utils/companyScope');
const { testDataWhere, parsePagination, paginationMeta } = require('../shared/investmentQueryScope');
const { Op } = require('sequelize');

async function listBrokers(req) {
  const { page, limit, offset } = parsePagination(req.query, 50, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  if (req.query.search) {
    where[Op.or] = [
      { brokerName: { [Op.like]: `%${req.query.search}%` } },
      { brokerCode: { [Op.like]: `%${req.query.search}%` } },
    ];
  }
  const { count, rows } = await InvestmentBroker.findAndCountAll({
    where,
    order: [['brokerName', 'ASC']],
    limit,
    offset,
  });
  return { brokers: rows, pagination: paginationMeta(count, page, limit) };
}

async function createBroker(req, data) {
  return InvestmentBroker.create(
    withCompanyId(req, {
      brokerCode: data.brokerCode || `BRK-${Date.now().toString().slice(-5)}`,
      brokerName: data.brokerName,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      countryCode: data.countryCode || null,
      status: data.status || 'ACTIVE',
      isTestData: !!data.isTestData,
    })
  );
}

async function updateBroker(req, id, data) {
  const row = await InvestmentBroker.findOne({ where: { id, ...companyWhere(req) } });
  if (!row) {
    const err = new Error('Broker not found');
    err.statusCode = 404;
    throw err;
  }
  await row.update(data);
  return row;
}

async function listCustodians(req) {
  const { page, limit, offset } = parsePagination(req.query, 50, 100);
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  const { count, rows } = await InvestmentCustodian.findAndCountAll({
    where,
    order: [['custodianName', 'ASC']],
    limit,
    offset,
  });
  return { custodians: rows, pagination: paginationMeta(count, page, limit) };
}

async function createCustodian(req, data) {
  return InvestmentCustodian.create(
    withCompanyId(req, {
      custodianCode: data.custodianCode || `CST-${Date.now().toString().slice(-5)}`,
      custodianName: data.custodianName,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      countryCode: data.countryCode || null,
      status: data.status || 'ACTIVE',
      isTestData: !!data.isTestData,
    })
  );
}

async function updateCustodian(req, id, data) {
  const row = await InvestmentCustodian.findOne({ where: { id, ...companyWhere(req) } });
  if (!row) {
    const err = new Error('Custodian not found');
    err.statusCode = 404;
    throw err;
  }
  await row.update(data);
  return row;
}

async function listAccounts(req) {
  const where = { ...companyWhere(req), ...testDataWhere(req) };
  return InvestmentAccount.findAll({ where, order: [['accountName', 'ASC']] });
}

async function createAccount(req, data) {
  return InvestmentAccount.create(
    withCompanyId(req, {
      portfolioId: data.portfolioId || null,
      accountCode: data.accountCode || `ACC-${Date.now().toString().slice(-5)}`,
      accountName: data.accountName,
      accountType: data.accountType || 'BROKERAGE',
      brokerId: data.brokerId || null,
      custodianId: data.custodianId || null,
      bankAccountId: data.bankAccountId || null,
      currencyCode: data.currencyCode || 'AED',
      status: data.status || 'ACTIVE',
      isTestData: !!data.isTestData,
    })
  );
}

module.exports = {
  listBrokers,
  createBroker,
  updateBroker,
  listCustodians,
  createCustodian,
  updateCustodian,
  listAccounts,
  createAccount,
};
