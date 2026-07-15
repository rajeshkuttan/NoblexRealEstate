'use strict';

const { Op } = require('sequelize');
const Decimal = require('decimal.js');
const {
  PrepaidExpense,
  PrepaidExpenseCategory,
  PrepaidExpenseScheduleLine,
  PrepaidExpenseAllocation,
  PrepaidExpenseSettings,
  ChartOfAccount,
  Vendor,
  Property,
  Unit,
  Lease,
  sequelize,
} = require('../../models');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../../utils/companyScope');
const calc = require('./prepaidCalculation.service');
const { validatePrepaidForSave, validateAllocations } = require('./prepaidValidation.service');
const { generatePrepaidNumber } = require('./prepaidDocumentNumber.service');
const scheduleService = require('./prepaidSchedule.service');

const DEFAULT_INCLUDE = [
  { model: PrepaidExpenseCategory, as: 'category', required: false },
  {
    model: ChartOfAccount,
    as: 'prepaidAssetAccount',
    attributes: ['id', 'accountCode', 'accountName'],
    required: false,
  },
  {
    model: ChartOfAccount,
    as: 'expenseAccount',
    attributes: ['id', 'accountCode', 'accountName'],
    required: false,
  },
  {
    model: ChartOfAccount,
    as: 'creditAccount',
    attributes: ['id', 'accountCode', 'accountName'],
    required: false,
  },
  { model: Vendor, as: 'vendor', required: false },
  { model: Property, as: 'property', required: false },
  { model: Unit, as: 'unit', required: false },
  { model: Lease, as: 'lease', required: false },
  { model: PrepaidExpenseScheduleLine, as: 'scheduleLines', required: false },
  { model: PrepaidExpenseAllocation, as: 'allocations', required: false },
];

function normalizeCreatePayload(body) {
  const exchangeRate = parseFloat(body.exchangeRate ?? body.exchange_rate ?? 1) || 1;
  const totalAmount = body.totalAmount ?? body.total_amount;
  return {
    categoryId: body.categoryId ?? body.category_id ?? null,
    description: body.description,
    supplierId: body.supplierId ?? body.supplier_id ?? null,
    sourceType: body.sourceType ?? body.source_type ?? 'MANUAL',
    sourceDocumentId: body.sourceDocumentId ?? body.source_document_id ?? null,
    sourceDocumentNumber: body.sourceDocumentNumber ?? body.source_document_number ?? null,
    purchaseInvoiceId: body.purchaseInvoiceId ?? body.purchase_invoice_id ?? null,
    directPurchaseInvoiceId: body.directPurchaseInvoiceId ?? body.direct_purchase_invoice_id ?? null,
    paymentId: body.paymentId ?? body.payment_id ?? null,
    currencyCode: body.currencyCode ?? body.currency_code ?? 'AED',
    exchangeRate,
    totalAmount,
    baseCurrencyAmount: body.baseCurrencyAmount ?? body.base_currency_amount ?? new Decimal(totalAmount).times(exchangeRate).toFixed(2),
    serviceStartDate: body.serviceStartDate ?? body.service_start_date,
    serviceEndDate: body.serviceEndDate ?? body.service_end_date,
    recognitionMethod: body.recognitionMethod ?? body.recognition_method ?? 'DAILY_CALENDAR_MONTH',
    postingMode: body.postingMode ?? body.posting_mode ?? 'AUTO_CREATE_DRAFT_JV',
    prepaidAssetAccountId: body.prepaidAssetAccountId ?? body.prepaid_asset_account_id,
    expenseAccountId: body.expenseAccountId ?? body.expense_account_id,
    creditAccountId: body.creditAccountId ?? body.credit_account_id ?? null,
    costCenterId: body.costCenterId ?? body.cost_center_id ?? null,
    departmentId: body.departmentId ?? body.department_id ?? null,
    propertyId: body.propertyId ?? body.property_id ?? null,
    unitId: body.unitId ?? body.unit_id ?? null,
    projectId: body.projectId ?? body.project_id ?? null,
    leaseId: body.leaseId ?? body.lease_id ?? null,
    vendorId: body.vendorId ?? body.vendor_id ?? null,
    initialPostingRequired: body.initialPostingRequired ?? body.initial_posting_required ?? false,
    notes: body.notes,
    isTestData: body.isTestData ?? body.is_test_data ?? false,
  };
}

async function getSettings(req) {
  let settings = await PrepaidExpenseSettings.findOne({ where: companyWhere(req) });
  if (!settings) {
    settings = await PrepaidExpenseSettings.create(
      withCompanyId(req, {
        defaultPostingMode: 'AUTO_CREATE_DRAFT_JV',
        defaultRecognitionMethod: 'DAILY_CALENDAR_MONTH',
        settingsJson: PrepaidExpenseSettings.DEFAULT_SETTINGS_JSON,
      })
    );
  }
  return settings;
}

async function updateSettings(req, payload) {
  const settings = await getSettings(req);
  const updates = {};
  if (payload.defaultPostingMode != null) updates.defaultPostingMode = payload.defaultPostingMode;
  if (payload.defaultRecognitionMethod != null) updates.defaultRecognitionMethod = payload.defaultRecognitionMethod;
  if (payload.settingsJson != null) {
    updates.settingsJson = { ...settings.settingsJson, ...payload.settingsJson };
  }
  await settings.update(updates);
  return settings;
}

async function listCategories(req) {
  return PrepaidExpenseCategory.findAll({
    where: { ...companyWhere(req), isActive: true },
    order: [['categoryName', 'ASC']],
  });
}

async function createCategory(req, body) {
  return PrepaidExpenseCategory.create(
    withCompanyId(req, {
      categoryCode: body.categoryCode ?? body.category_code,
      categoryName: body.categoryName ?? body.category_name,
      description: body.description,
      defaultPrepaidAssetAccountId: body.defaultPrepaidAssetAccountId ?? body.default_prepaid_asset_account_id,
      defaultExpenseAccountId: body.defaultExpenseAccountId ?? body.default_expense_account_id,
      recognitionMethod: body.recognitionMethod ?? 'DAILY_CALENDAR_MONTH',
      postingMode: body.postingMode ?? 'AUTO_CREATE_DRAFT_JV',
      isActive: body.isActive !== false,
      createdBy: req.user?.id,
    })
  );
}

async function updateCategory(req, id, body) {
  const cat = await assertRecordInCompany(PrepaidExpenseCategory, id, req);
  await cat.update({
    categoryCode: body.categoryCode ?? cat.categoryCode,
    categoryName: body.categoryName ?? cat.categoryName,
    description: body.description ?? cat.description,
    defaultPrepaidAssetAccountId: body.defaultPrepaidAssetAccountId ?? cat.defaultPrepaidAssetAccountId,
    defaultExpenseAccountId: body.defaultExpenseAccountId ?? cat.defaultExpenseAccountId,
    recognitionMethod: body.recognitionMethod ?? cat.recognitionMethod,
    postingMode: body.postingMode ?? cat.postingMode,
    isActive: body.isActive ?? cat.isActive,
    updatedBy: req.user?.id,
  });
  return cat;
}

async function deleteCategory(req, id) {
  const cat = await assertRecordInCompany(PrepaidExpenseCategory, id, req);
  await cat.destroy();
  return { id };
}

async function listPrepaidExpenses(req, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const where = { ...companyWhere(req) };

  if (query.status) where.status = query.status;
  if (query.categoryId) where.categoryId = query.categoryId;
  if (query.search) {
    where[Op.or] = [
      { prepaidNumber: { [Op.like]: `%${query.search}%` } },
      { description: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await PrepaidExpense.findAndCountAll({
    where,
    include: DEFAULT_INCLUDE.filter((i) => i.as !== 'scheduleLines' && i.as !== 'allocations'),
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } };
}

async function getPrepaidExpense(req, id, options = {}) {
  const record = await PrepaidExpense.findOne({
    where: { id, ...companyWhere(req) },
    include: DEFAULT_INCLUDE,
    transaction: options.transaction,
  });
  if (!record) {
    const err = new Error('Prepaid expense not found');
    err.statusCode = 404;
    throw err;
  }
  return record;
}

async function createPrepaidExpense(req, body) {
  const payload = normalizeCreatePayload(body);
  await validatePrepaidForSave(req, payload);

  const settings = await getSettings(req);
  if (!payload.postingMode) payload.postingMode = settings.defaultPostingMode;
  if (!payload.recognitionMethod) payload.recognitionMethod = settings.defaultRecognitionMethod;

  const totalDays = calc.calculateInclusiveDays(payload.serviceStartDate, payload.serviceEndDate);
  const dailyRate = calc.calculateDailyRate(payload.totalAmount, totalDays);

  return sequelize.transaction(async (transaction) => {
    const prepaidNumber = await generatePrepaidNumber(req, transaction);
    const record = await PrepaidExpense.create(
      withCompanyId(req, {
        ...payload,
        prepaidNumber,
        totalServiceDays: totalDays,
        dailyRate,
        remainingAmount: payload.totalAmount,
        recognizedAmount: 0,
        status: 'DRAFT',
        approvalStatus: 'DRAFT',
        scheduleStatus: 'NONE',
        createdBy: req.user?.id || 1,
      }),
      { transaction }
    );

    if (body.allocations?.length) {
      validateAllocations(body.allocations);
      for (const row of body.allocations) {
        await PrepaidExpenseAllocation.create(
          withCompanyId(req, {
            prepaidExpenseId: record.id,
            ...row,
          }),
          { transaction }
        );
      }
    }

    // Must reload inside the same transaction or the uncommitted row is invisible.
    return getPrepaidExpense(req, record.id, { transaction });
  });
}

async function updatePrepaidExpense(req, id, body) {
  const record = await assertRecordInCompany(PrepaidExpense, id, req);
  if (!['DRAFT', 'SCHEDULE_GENERATED'].includes(record.status)) {
    const err = new Error('Only draft or schedule-generated records can be updated');
    err.statusCode = 400;
    throw err;
  }

  const payload = normalizeCreatePayload({ ...record.toJSON(), ...body });
  await validatePrepaidForSave(req, payload);

  const totalDays = calc.calculateInclusiveDays(payload.serviceStartDate, payload.serviceEndDate);
  const dailyRate = calc.calculateDailyRate(payload.totalAmount, totalDays);

  await record.update({
    ...payload,
    totalServiceDays: totalDays,
    dailyRate,
    remainingAmount: new Decimal(payload.totalAmount).minus(record.recognizedAmount || 0).toFixed(2),
  });

  return getPrepaidExpense(req, id);
}

async function deletePrepaidExpense(req, id) {
  const record = await assertRecordInCompany(PrepaidExpense, id, req);
  if (record.status !== 'DRAFT') {
    const err = new Error('Only draft prepaid expenses can be deleted');
    err.statusCode = 400;
    throw err;
  }
  await record.destroy();
  return { id };
}

async function clonePrepaidExpense(req, id) {
  const source = await getPrepaidExpense(req, id);
  const json = source.toJSON();
  delete json.id;
  delete json.prepaidNumber;
  json.status = 'DRAFT';
  json.approvalStatus = 'DRAFT';
  json.scheduleStatus = 'NONE';
  json.recognizedAmount = 0;
  json.remainingAmount = json.totalAmount;
  json.description = `${json.description || ''} (Copy)`.trim();

  return createPrepaidExpense(req, {
    ...json,
    allocations: (json.allocations || []).map(({ id: _id, prepaidExpenseId, ...rest }) => rest),
  });
}

async function generateSchedule(req, id) {
  return sequelize.transaction(async (transaction) => {
    const record = await assertRecordInCompany(PrepaidExpense, id, req, { transaction });
    await scheduleService.generateAndPersistSchedule(req, record, transaction);
    return getPrepaidExpense(req, id, { transaction });
  });
}

async function regenerateSchedule(req, id) {
  return sequelize.transaction(async (transaction) => {
    const record = await assertRecordInCompany(PrepaidExpense, id, req, { transaction });
    await scheduleService.regenerateSchedule(req, record, transaction);
    return getPrepaidExpense(req, id, { transaction });
  });
}

async function replaceAllocations(req, id, allocations = []) {
  validateAllocations(allocations);
  const record = await assertRecordInCompany(PrepaidExpense, id, req);
  await PrepaidExpenseAllocation.destroy({ where: { prepaidExpenseId: id, ...companyWhere(req) } });
  for (const row of allocations) {
    await PrepaidExpenseAllocation.create(
      withCompanyId(req, { prepaidExpenseId: id, ...row })
    );
  }
  return getPrepaidExpense(req, id);
}

module.exports = {
  getSettings,
  updateSettings,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listPrepaidExpenses,
  getPrepaidExpense,
  createPrepaidExpense,
  updatePrepaidExpense,
  deletePrepaidExpense,
  clonePrepaidExpense,
  generateSchedule,
  regenerateSchedule,
  replaceAllocations,
};
