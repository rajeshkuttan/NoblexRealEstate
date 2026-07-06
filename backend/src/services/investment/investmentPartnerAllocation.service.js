const { InvestmentPartnerAllocation } = require('../../models');
const { companyWhere, withCompanyId } = require('../../utils/companyScope');
const portfolioService = require('./investmentPortfolio.service');
const { round2 } = require('./investmentFinancePostingUtils');

async function validateAllocationTotal(req, assetId, excludeId = null) {
  const where = { investmentAssetId: assetId, isActive: true, ...companyWhere(req) };
  const rows = await InvestmentPartnerAllocation.findAll({ where });
  let total = 0;
  for (const row of rows) {
    if (excludeId && row.id === excludeId) continue;
    total += Number(row.ownershipPercentage || 0);
  }
  return round2(total);
}

async function assertAllocationTotal(req, assetId, newPct, excludeId = null) {
  const current = await validateAllocationTotal(req, assetId, excludeId);
  const total = round2(current + Number(newPct || 0));
  if (Math.abs(total - 100) > 0.01) {
    const err = new Error(`Allocation must total 100%. Current would be ${total}%`);
    err.statusCode = 400;
    throw err;
  }
}

async function listAllocations(req, assetId) {
  await portfolioService.getAssetDetail(req, assetId);
  return InvestmentPartnerAllocation.findAll({
    where: { investmentAssetId: assetId, ...companyWhere(req), isActive: true },
    order: [['ownershipPercentage', 'DESC']],
  });
}

async function createAllocation(req, assetId, data) {
  await portfolioService.getAssetDetail(req, assetId);
  await assertAllocationTotal(req, assetId, data.ownershipPercentage);
  if (!data.investorName) {
    const err = new Error('investor_name is required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentPartnerAllocation.create(
    withCompanyId(req, {
      investmentAssetId: assetId,
      investorType: data.investorType || 'PARTNER',
      investorRefId: data.investorRefId || null,
      investorName: data.investorName,
      contributionAmount: data.contributionAmount || 0,
      ownershipPercentage: data.ownershipPercentage || 0,
      profitSharePercentage: data.profitSharePercentage ?? data.ownershipPercentage ?? 0,
      dividendSharePercentage: data.dividendSharePercentage ?? data.ownershipPercentage ?? 0,
      isActive: true,
    })
  );
}

async function updateAllocation(req, allocationId, data) {
  const alloc = await InvestmentPartnerAllocation.findOne({
    where: { id: allocationId, ...companyWhere(req) },
  });
  if (!alloc) {
    const err = new Error('Allocation not found');
    err.statusCode = 404;
    throw err;
  }
  if (data.ownershipPercentage != null) {
    await assertAllocationTotal(req, alloc.investmentAssetId, data.ownershipPercentage, alloc.id);
  }
  await alloc.update(data);
  return alloc;
}

async function deleteAllocation(req, allocationId) {
  const alloc = await InvestmentPartnerAllocation.findOne({
    where: { id: allocationId, ...companyWhere(req) },
  });
  if (!alloc) {
    const err = new Error('Allocation not found');
    err.statusCode = 404;
    throw err;
  }
  await alloc.update({ isActive: false });
  return { deleted: true };
}

async function listInvestors(req) {
  const rows = await InvestmentPartnerAllocation.findAll({
    where: { ...companyWhere(req), isActive: true },
    attributes: ['investorName', 'investorRefId'],
    order: [['investorName', 'ASC']],
  });
  const seen = new Map();
  for (const row of rows) {
    const name = row.investorName;
    if (!name || seen.has(name)) continue;
    seen.set(name, { investorName: name, investorRefId: row.investorRefId });
  }
  return [...seen.values()];
}

function distributeByAllocation(allocations, amount) {
  return allocations.map((a) => ({
    allocation: a,
    shareAmount: round2(Number(amount) * (Number(a.ownershipPercentage) / 100)),
  }));
}

function shareAmountForTransaction(alloc, txn) {
  const amount = Number(txn.baseAmount || txn.netAmount || 0);
  if (txn.transactionType === 'SELL') {
    const pct = Number(alloc.profitSharePercentage ?? alloc.ownershipPercentage ?? 0) / 100;
    return round2(amount * pct);
  }
  const pct = Number(alloc.dividendSharePercentage ?? alloc.ownershipPercentage ?? 0) / 100;
  return round2(amount * pct);
}

module.exports = {
  listAllocations,
  createAllocation,
  updateAllocation,
  deleteAllocation,
  validateAllocationTotal,
  distributeByAllocation,
  shareAmountForTransaction,
  listInvestors,
};
