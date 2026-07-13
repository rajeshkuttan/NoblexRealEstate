const { Op } = require('sequelize');
const {
  InvestmentCategory,
  InvestmentAsset,
  InvestmentHolding,
} = require('../../models');
const { companyWhere, withCompanyId } = require('../../utils/companyScope');
const { allocateInvestmentNumber } = require('./investmentDocumentNumber.service');
const { sequelize } = require('../../config/database');
const {
  testDataWhere,
  parsePagination,
  paginationMeta,
  parseSort,
} = require('./shared/investmentQueryScope');

async function listCategories(req) {
  const where = {
    ...companyWhere(req),
    ...testDataWhere(req),
    isActive: true,
    isArchived: false,
  };
  if (req.query?.includeArchived === 'true') delete where.isArchived;
  return InvestmentCategory.findAll({
    where,
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
    isTestData: !!data.isTestData,
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
  if (data.isArchived != null) updates.isArchived = !!data.isArchived;
  if (data.isTestData != null) updates.isTestData = !!data.isTestData;
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
  await cat.update({ isActive: false, isArchived: true });
  await cat.destroy();
  return { deleted: true };
}

async function restoreCategory(req, categoryId) {
  const cat = await InvestmentCategory.findOne({
    where: { id: categoryId, ...companyWhere(req) },
    paranoid: false,
  });
  if (!cat) {
    const err = new Error('Category not found');
    err.statusCode = 404;
    throw err;
  }
  await cat.restore();
  await cat.update({ isActive: true, isArchived: false });
  return cat;
}

async function listPortfolio(req, query = {}) {
  const { page, limit, offset } = parsePagination(query, 20, 100);
  const where = {
    ...companyWhere(req),
    ...testDataWhere(req),
    isArchived: false,
  };
  if (query.includeArchived === 'true') delete where.isArchived;
  if (query.status) where.status = query.status;
  if (query.assetType) where.assetType = query.assetType;
  if (query.search) {
    where[Op.or] = [
      { investmentName: { [Op.like]: `%${query.search}%` } },
      { investmentCode: { [Op.like]: `%${query.search}%` } },
      { tickerSymbol: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const order = parseSort(
    query,
    ['investmentName', 'investmentCode', 'assetType', 'status', 'createdAt'],
    [['investmentName', 'ASC']]
  );

  const { count, rows } = await InvestmentAsset.findAndCountAll({
    where,
    include: [
      { model: InvestmentCategory, as: 'category', attributes: ['id', 'name', 'code'] },
      { model: InvestmentHolding, as: 'holding' },
    ],
    order,
    limit,
    offset,
  });
  return {
    assets: rows,
    pagination: paginationMeta(count, page, limit),
  };
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
        isTestData: !!data.isTestData,
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
  if (asset.status === 'ACTIVE' && Number(asset.holding?.quantity || 0) > 0) {
    const err = new Error('Cannot delete an active asset with holdings — archive instead');
    err.statusCode = 400;
    throw err;
  }
  await asset.update({ isArchived: true, status: asset.status === 'DRAFT' ? 'CLOSED' : asset.status });
  await asset.destroy();
  return { deleted: true };
}

async function archiveAsset(req, assetId) {
  const asset = await getAssetDetail(req, assetId);
  await asset.update({ isArchived: true });
  return getAssetDetail(req, assetId);
}

async function restoreAsset(req, assetId) {
  const asset = await InvestmentAsset.findOne({
    where: { id: assetId, ...companyWhere(req) },
    paranoid: false,
  });
  if (!asset) {
    const err = new Error('Investment asset not found');
    err.statusCode = 404;
    throw err;
  }
  await asset.restore();
  await asset.update({ isArchived: false });
  return getAssetDetail(req, assetId);
}

async function cloneAsset(req, assetId) {
  const source = await getAssetDetail(req, assetId);
  const plain = source.toJSON();
  delete plain.id;
  delete plain.investmentCode;
  delete plain.holding;
  delete plain.category;
  delete plain.createdAt;
  delete plain.updatedAt;
  delete plain.deletedAt;
  return createAsset(req, {
    ...plain,
    investmentName: `${plain.investmentName} (Copy)`,
    status: 'DRAFT',
    isArchived: false,
  });
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
  restoreCategory,
  normalizeCategoryInput,
  listPortfolio,
  getAssetDetail,
  createAsset,
  updateAsset,
  deleteAsset,
  archiveAsset,
  restoreAsset,
  cloneAsset,
  getHoldingSummary,
};
