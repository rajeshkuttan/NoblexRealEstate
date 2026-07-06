const { Op } = require('sequelize');
const {
  InvestmentCategory,
  InvestmentAsset,
  InvestmentHolding,
} = require('../../models');
const { companyWhere, withCompanyId } = require('../../utils/companyScope');
const { allocateInvestmentNumber } = require('./investmentDocumentNumber.service');
const { sequelize } = require('../../config/database');

async function listCategories(req) {
  return InvestmentCategory.findAll({
    where: { ...companyWhere(req), isActive: true },
    order: [['name', 'ASC']],
  });
}

function normalizeCategoryInput(data = {}) {
  return {
    code: data.code || data.categoryCode,
    name: data.name || data.categoryName,
    assetClass: data.assetClass || data.assetType,
    description: data.description,
    isActive: data.isActive !== false,
  };
}

async function createCategory(req, data) {
  const payload = normalizeCategoryInput(data);
  if (!payload.code || !payload.name) {
    const err = new Error('Category code and name are required');
    err.statusCode = 400;
    throw err;
  }
  return InvestmentCategory.create(withCompanyId(req, payload));
}

async function updateCategory(req, categoryId, data) {
  const cat = await InvestmentCategory.findOne({
    where: { id: categoryId, ...companyWhere(req) },
  });
  if (!cat) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }
  const payload = normalizeCategoryInput(data);
  const updates = {};
  if (payload.code) updates.code = payload.code;
  if (payload.name) updates.name = payload.name;
  if (payload.assetClass != null) updates.assetClass = payload.assetClass;
  if (payload.description != null) updates.description = payload.description;
  if (data.isActive != null) updates.isActive = !!data.isActive;
  if (Object.keys(updates).length) await cat.update(updates);
  return cat;
}

async function deleteCategory(req, categoryId) {
  const cat = await InvestmentCategory.findOne({
    where: { id: categoryId, ...companyWhere(req) },
  });
  if (!cat) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }
  await cat.update({ isActive: false });
  return { deleted: true };
}

async function listPortfolio(req, { page = 1, limit = 20, status, assetType, search } = {}) {
  const where = { ...companyWhere(req) };
  if (status) where.status = status;
  if (assetType) where.assetType = assetType;
  if (search) {
    where[Op.or] = [
      { investmentName: { [Op.like]: `%${search}%` } },
      { investmentCode: { [Op.like]: `%${search}%` } },
      { tickerSymbol: { [Op.like]: `%${search}%` } },
    ];
  }

  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await InvestmentAsset.findAndCountAll({
    where,
    include: [
      { model: InvestmentCategory, as: 'category', attributes: ['id', 'name', 'code'] },
      { model: InvestmentHolding, as: 'holding' },
    ],
    order: [['investmentName', 'ASC']],
    limit: Number(limit),
    offset,
  });
  return { assets: rows, pagination: { total: count, page: Number(page), limit: Number(limit), totalPages: Math.ceil(count / limit) } };
}

async function getAssetDetail(req, assetId) {
  const asset = await InvestmentAsset.findOne({
    where: { id: assetId, ...companyWhere(req) },
    include: [
      { model: InvestmentCategory, as: 'category' },
      { model: InvestmentHolding, as: 'holding' },
    ],
  });
  if (!asset) {
    const err = new Error('Investment asset not found');
    err.statusCode = 404;
    throw err;
  }
  return asset;
}

async function createAsset(req, data) {
  const t = await sequelize.transaction();
  try {
    const investmentCode = await allocateInvestmentNumber(req.companyId, 'asset', t);
    const asset = await InvestmentAsset.create(
      withCompanyId(req, {
        ...data,
        investmentCode,
        status: data.status || 'DRAFT',
      }),
      { transaction: t }
    );
    await InvestmentHolding.create(
      withCompanyId(req, {
        investmentAssetId: asset.id,
        quantity: 0,
        averageCost: 0,
        totalCost: 0,
        currentPrice: 0,
        currentMarketValue: 0,
        baseCurrencyValue: 0,
        unrealizedGainLoss: 0,
        realizedGainLoss: 0,
      }),
      { transaction: t }
    );
    await t.commit();
    return getAssetDetail(req, asset.id);
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

async function updateAsset(req, assetId, data) {
  const asset = await getAssetDetail(req, assetId);
  const forbidden = ['id', 'companyId', 'investmentCode'];
  forbidden.forEach((k) => delete data[k]);
  await asset.update(data);
  return getAssetDetail(req, assetId);
}

async function deleteAsset(req, assetId) {
  const asset = await getAssetDetail(req, assetId);
  if (asset.status !== 'DRAFT') {
    const err = new Error('Only draft assets can be deleted');
    err.statusCode = 400;
    throw err;
  }
  await asset.destroy();
  return { deleted: true };
}

async function getHoldingSummary(req, assetId) {
  const asset = await getAssetDetail(req, assetId);
  return asset.holding || null;
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  normalizeCategoryInput,
  listPortfolio,
  getAssetDetail,
  createAsset,
  updateAsset,
  deleteAsset,
  getHoldingSummary,
};
