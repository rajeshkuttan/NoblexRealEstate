'use strict';

const { Op } = require('sequelize');
const Decimal = require('decimal.js');
const {
  LeaseRevenueSchedule,
  LeaseRevenueComponent,
  LeaseRevenueScheduleLine,
  LeaseRevenueSettings,
  ChartOfAccount,
  Lease,
  Tenant,
  Property,
  Unit,
  Service,
  sequelize,
} = require('../../models');
const { companyWhere, withCompanyId, assertRecordInCompany } = require('../../utils/companyScope');
const calc = require('./leaseRevenueCalculation.service');
const { validateScheduleForSave } = require('./leaseRevenueValidation.service');
const { generateScheduleNumber } = require('./leaseRevenueDocumentNumber.service');
const scheduleService = require('./leaseRevenueSchedule.service');

const DEFAULT_INCLUDE = [
  { model: Lease, as: 'lease', required: false },
  { model: Tenant, as: 'tenant', required: false },
  { model: Property, as: 'property', required: false },
  { model: Unit, as: 'unit', required: false },
  {
    model: ChartOfAccount,
    as: 'revenueAccount',
    attributes: ['id', 'accountCode', 'accountName'],
    required: false,
  },
  {
    model: ChartOfAccount,
    as: 'deferredRevenueAccount',
    attributes: ['id', 'accountCode', 'accountName'],
    required: false,
  },
  {
    model: ChartOfAccount,
    as: 'receivableAccount',
    attributes: ['id', 'accountCode', 'accountName'],
    required: false,
  },
  {
    model: ChartOfAccount,
    as: 'accruedRevenueAccount',
    attributes: ['id', 'accountCode', 'accountName'],
    required: false,
  },
  { model: LeaseRevenueComponent, as: 'components', required: false },
  { model: LeaseRevenueScheduleLine, as: 'scheduleLines', required: false },
];

const COA_CODE_PREFIXES = {
  deferred: ['2520', '2510', '2500'],
  revenue: ['4100', '4200', '4300', '4400', '4500'],
  accrued: ['1300', '1310'],
  receivable: ['1200', '1210'],
};

async function findLeafAccountByPrefixes(req, prefixes, expectType, transaction) {
  for (const prefix of prefixes) {
    const candidates = await ChartOfAccount.findAll({
      where: {
        ...companyWhere(req),
        accountCode: { [Op.like]: `${prefix}%` },
        isActive: true,
        ...(expectType ? { accountType: expectType } : {}),
      },
      order: [['accountCode', 'ASC']],
      transaction,
    });
    for (const acct of candidates) {
      const childCount = await ChartOfAccount.count({
        where: { parentAccountId: acct.id, ...companyWhere(req) },
        transaction,
      });
      if (childCount === 0) return acct;
    }
  }
  return null;
}

function normalizeCreatePayload(body) {
  const exchangeRate = parseFloat(body.exchangeRate ?? body.exchange_rate ?? 1) || 1;
  const totalAmount = body.totalContractAmount ?? body.total_contract_amount ?? body.totalAmount;
  return {
    leaseId: body.leaseId ?? body.lease_id,
    tenantId: body.tenantId ?? body.tenant_id ?? null,
    propertyId: body.propertyId ?? body.property_id ?? null,
    unitId: body.unitId ?? body.unit_id ?? null,
    revenueType: body.revenueType ?? body.revenue_type ?? 'BASE_RENT',
    revenueModel: body.revenueModel ?? body.revenue_model ?? 'DEFERRED',
    recognitionMethod: body.recognitionMethod ?? body.recognition_method ?? 'DAILY_CALENDAR_MONTH',
    sourceType: body.sourceType ?? body.source_type ?? 'MANUAL',
    totalContractAmount: totalAmount,
    revenueAccountId: body.revenueAccountId ?? body.revenue_account_id,
    deferredRevenueAccountId: body.deferredRevenueAccountId ?? body.deferred_revenue_account_id ?? null,
    receivableAccountId: body.receivableAccountId ?? body.receivable_account_id ?? null,
    accruedRevenueAccountId: body.accruedRevenueAccountId ?? body.accrued_revenue_account_id ?? null,
    currencyCode: body.currencyCode ?? body.currency_code ?? 'AED',
    exchangeRate,
    serviceStartDate: body.serviceStartDate ?? body.service_start_date,
    serviceEndDate: body.serviceEndDate ?? body.service_end_date,
    postingMode: body.postingMode ?? body.posting_mode ?? 'AUTO_CREATE_DRAFT_JV',
    notes: body.notes,
    isTestData: body.isTestData ?? body.is_test_data ?? false,
  };
}

async function getSettings(req) {
  let settings = await LeaseRevenueSettings.findOne({ where: companyWhere(req) });
  if (!settings) {
    settings = await LeaseRevenueSettings.create(
      withCompanyId(req, {
        defaultPostingMode: 'AUTO_CREATE_DRAFT_JV',
        defaultRecognitionMethod: 'DAILY_CALENDAR_MONTH',
        defaultRevenueModel: 'DEFERRED',
        settingsJson: LeaseRevenueSettings.DEFAULT_SETTINGS_JSON,
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
  if (payload.defaultRevenueModel != null) updates.defaultRevenueModel = payload.defaultRevenueModel;
  if (payload.settingsJson != null) {
    updates.settingsJson = { ...settings.settingsJson, ...payload.settingsJson };
  }
  await settings.update(updates);
  return settings;
}

async function listSchedules(req, query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const where = { ...companyWhere(req) };

  if (query.status) where.status = query.status;
  if (query.leaseId != null && query.leaseId !== '') {
    const leaseIdNum = parseInt(query.leaseId, 10);
    if (!Number.isNaN(leaseIdNum)) where.leaseId = leaseIdNum;
  }
  if (query.search) {
    where[Op.or] = [
      { scheduleNumber: { [Op.like]: `%${query.search}%` } },
      { notes: { [Op.like]: `%${query.search}%` } },
    ];
  }

  const { rows, count } = await LeaseRevenueSchedule.findAndCountAll({
    where,
    include: DEFAULT_INCLUDE.filter((i) => i.as !== 'scheduleLines' && i.as !== 'components'),
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  return { data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } };
}

async function getSchedule(req, id, options = {}) {
  const record = await LeaseRevenueSchedule.findOne({
    where: { id, ...companyWhere(req) },
    include: DEFAULT_INCLUDE,
    transaction: options.transaction,
  });
  if (!record) {
    const err = new Error('Lease revenue schedule not found');
    err.statusCode = 404;
    throw err;
  }
  return record;
}

async function createSchedule(req, body) {
  const payload = normalizeCreatePayload(body);
  await validateScheduleForSave(req, payload);

  const settings = await getSettings(req);
  if (!payload.postingMode) payload.postingMode = settings.defaultPostingMode;
  if (!payload.recognitionMethod) payload.recognitionMethod = settings.defaultRecognitionMethod;
  if (!payload.revenueModel) payload.revenueModel = settings.defaultRevenueModel;

  const totalDays = calc.calculateInclusiveDays(payload.serviceStartDate, payload.serviceEndDate);
  const dailyRate = calc.calculateDailyRate(payload.totalContractAmount, totalDays);

  return sequelize.transaction(async (transaction) => {
    const scheduleNumber = await generateScheduleNumber(req, transaction);
    const record = await LeaseRevenueSchedule.create(
      withCompanyId(req, {
        ...payload,
        scheduleNumber,
        totalServiceDays: totalDays,
        dailyRate,
        deferredBalance: payload.totalContractAmount,
        remainingAmount: payload.totalContractAmount,
        recognizedAmount: 0,
        status: 'DRAFT',
        approvalStatus: 'DRAFT',
        scheduleStatus: 'NONE',
        versionNumber: 1,
        createdBy: req.user?.id || 1,
      }),
      { transaction }
    );

    if (body.components?.length) {
      for (const comp of body.components) {
        await LeaseRevenueComponent.create(
          withCompanyId(req, {
            scheduleId: record.id,
            componentCode: comp.componentCode ?? comp.component_code,
            componentName: comp.componentName ?? comp.component_name,
            leaseChargeId: comp.leaseChargeId ?? comp.lease_charge_id ?? null,
            serviceId: comp.serviceId ?? comp.service_id ?? null,
            amount: comp.amount,
            revenueType: comp.revenueType ?? comp.revenue_type ?? 'OTHER',
            revenueAccountId: comp.revenueAccountId ?? comp.revenue_account_id ?? payload.revenueAccountId,
            deferredRevenueAccountId:
              comp.deferredRevenueAccountId ?? comp.deferred_revenue_account_id ?? payload.deferredRevenueAccountId,
            startDate: comp.startDate ?? comp.start_date ?? payload.serviceStartDate,
            endDate: comp.endDate ?? comp.end_date ?? payload.serviceEndDate,
          }),
          { transaction }
        );
      }
    }

    return getSchedule(req, record.id, { transaction });
  });
}

async function updateSchedule(req, id, body) {
  const record = await assertRecordInCompany(LeaseRevenueSchedule, id, req);
  if (!['DRAFT', 'SCHEDULE_GENERATED'].includes(record.status)) {
    const err = new Error('Only draft or schedule-generated records can be updated');
    err.statusCode = 400;
    throw err;
  }

  const payload = normalizeCreatePayload({ ...record.toJSON(), ...body });
  await validateScheduleForSave(req, payload);

  const totalDays = calc.calculateInclusiveDays(payload.serviceStartDate, payload.serviceEndDate);
  const dailyRate = calc.calculateDailyRate(payload.totalContractAmount, totalDays);

  await record.update({
    ...payload,
    totalServiceDays: totalDays,
    dailyRate,
    deferredBalance: new Decimal(payload.totalContractAmount).minus(record.recognizedAmount || 0).toFixed(2),
    remainingAmount: new Decimal(payload.totalContractAmount).minus(record.recognizedAmount || 0).toFixed(2),
  });

  return getSchedule(req, id);
}

async function deleteSchedule(req, id) {
  const record = await assertRecordInCompany(LeaseRevenueSchedule, id, req);
  if (record.status !== 'DRAFT') {
    const err = new Error('Only draft lease revenue schedules can be deleted');
    err.statusCode = 400;
    throw err;
  }
  await record.destroy();
  return { id };
}

async function cloneSchedule(req, id) {
  const source = await getSchedule(req, id);
  const json = source.toJSON();
  delete json.id;
  delete json.scheduleNumber;
  json.status = 'DRAFT';
  json.approvalStatus = 'DRAFT';
  json.scheduleStatus = 'NONE';
  json.recognizedAmount = 0;
  json.remainingAmount = json.totalContractAmount;
  json.deferredBalance = json.totalContractAmount;
  json.notes = `${json.notes || ''} (Copy)`.trim();

  return createSchedule(req, {
    ...json,
    components: (json.components || []).map(({ id: _id, scheduleId, ...rest }) => rest),
  });
}

async function generateSchedule(req, id) {
  return sequelize.transaction(async (transaction) => {
    const record = await assertRecordInCompany(LeaseRevenueSchedule, id, req, { transaction });
    await scheduleService.generateAndPersistSchedule(req, record, transaction);
    return getSchedule(req, id, { transaction });
  });
}

async function regenerateSchedule(req, id) {
  return sequelize.transaction(async (transaction) => {
    const record = await assertRecordInCompany(LeaseRevenueSchedule, id, req, { transaction });
    await scheduleService.regenerateSchedule(req, record, transaction);
    return getSchedule(req, id, { transaction });
  });
}

async function buildLeaseComponents(req, lease, accounts, transaction) {
  const components = [];
  const rentAmount = parseFloat(lease.rentAmount || 0);
  if (rentAmount > 0) {
    components.push({
      componentCode: 'BASE_RENT',
      componentName: 'Base Rent',
      amount: rentAmount,
      revenueType: 'BASE_RENT',
      revenueAccountId: accounts.revenue?.id,
      deferredRevenueAccountId: accounts.deferred?.id,
      startDate: lease.startDate,
      endDate: lease.endDate,
      leaseChargeId: null,
      serviceId: null,
    });
  }

  const services = await Service.findAll({
    where: {
      entityType: 'lease',
      entityId: lease.id,
      isActive: true,
      billingMethod: 'charged_separately',
    },
    order: [['sortOrder', 'ASC']],
    transaction,
  });

  for (const svc of services) {
    const amt = parseFloat(svc.amount || 0);
    if (amt <= 0) continue;
    const code = (svc.name || 'SERVICE').toUpperCase().replace(/\s+/g, '_').slice(0, 50);
    components.push({
      componentCode: code,
      componentName: svc.name,
      amount: amt,
      revenueType: 'LEASE_SERVICE',
      revenueAccountId: accounts.revenue?.id,
      deferredRevenueAccountId: accounts.deferred?.id,
      startDate: lease.startDate,
      endDate: lease.endDate,
      leaseChargeId: null,
      serviceId: svc.id,
    });
  }

  return components;
}

async function generateFromLease(req, leaseId, options = {}) {
  return sequelize.transaction(async (transaction) => {
    const lease = await Lease.findOne({
      where: { id: leaseId, ...companyWhere(req) },
      include: [{ model: Unit, as: 'unit', required: false }],
      transaction,
    });
    if (!lease) {
      const err = new Error('Lease not found');
      err.statusCode = 404;
      throw err;
    }
    if (!['active', 'renewed'].includes(lease.status)) {
      const err = new Error('Lease must be active or renewed to generate revenue schedule');
      err.statusCode = 400;
      throw err;
    }

    const settings = await getSettings(req);
    const revenueModel = options.revenueModel ?? settings.defaultRevenueModel ?? 'DEFERRED';

    const revenueAcct =
      options.revenueAccountId
        ? await ChartOfAccount.findByPk(options.revenueAccountId, { transaction })
        : await findLeafAccountByPrefixes(req, COA_CODE_PREFIXES.revenue, 'revenue', transaction);
    const deferredAcct =
      options.deferredRevenueAccountId
        ? await ChartOfAccount.findByPk(options.deferredRevenueAccountId, { transaction })
        : await findLeafAccountByPrefixes(req, COA_CODE_PREFIXES.deferred, 'liability', transaction);
    const accruedAcct = await findLeafAccountByPrefixes(req, COA_CODE_PREFIXES.accrued, 'asset', transaction);
    const receivableAcct = await findLeafAccountByPrefixes(req, COA_CODE_PREFIXES.receivable, 'asset', transaction);

    if (!revenueAcct) {
      const err = new Error('No postable revenue account found (4100–4500 range)');
      err.statusCode = 400;
      throw err;
    }
    if (revenueModel === 'DEFERRED' && !deferredAcct) {
      const err = new Error('No postable deferred revenue account found (2500–2520 range)');
      err.statusCode = 400;
      throw err;
    }

    const components = await buildLeaseComponents(
      req,
      lease,
      { revenue: revenueAcct, deferred: deferredAcct },
      transaction
    );
    if (!components.length) {
      const err = new Error('Lease has no billable rent or services to recognize');
      err.statusCode = 400;
      throw err;
    }

    const totalContractAmount = components.reduce((s, c) => s + parseFloat(c.amount), 0);
    const propertyId = lease.unit?.propertyId ?? null;

    const scheduleNumber = await generateScheduleNumber(req, transaction);
    const totalDays = calc.calculateInclusiveDays(lease.startDate, lease.endDate);
    const dailyRate = calc.calculateDailyRate(totalContractAmount, totalDays);

    const record = await LeaseRevenueSchedule.create(
      withCompanyId(req, {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        propertyId,
        unitId: lease.unitId,
        scheduleNumber,
        revenueType: 'COMPOSITE',
        revenueModel,
        recognitionMethod: settings.defaultRecognitionMethod,
        sourceType: 'LEASE',
        totalContractAmount: totalContractAmount.toFixed(2),
        deferredBalance: totalContractAmount.toFixed(2),
        recognizedAmount: 0,
        remainingAmount: totalContractAmount.toFixed(2),
        revenueAccountId: revenueAcct.id,
        deferredRevenueAccountId: deferredAcct?.id ?? null,
        receivableAccountId: receivableAcct?.id ?? null,
        accruedRevenueAccountId: accruedAcct?.id ?? null,
        currencyCode: 'AED',
        exchangeRate: 1,
        serviceStartDate: lease.startDate,
        serviceEndDate: lease.endDate,
        totalServiceDays: totalDays,
        dailyRate,
        scheduleStatus: 'NONE',
        approvalStatus: 'DRAFT',
        status: 'DRAFT',
        postingMode: settings.defaultPostingMode,
        versionNumber: 1,
        notes: options.notes || `Generated from lease ${lease.leaseNumber}`,
        isTestData: options.isTestData ?? false,
        createdBy: req.user?.id || 1,
      }),
      { transaction }
    );

    for (const comp of components) {
      await LeaseRevenueComponent.create(
        withCompanyId(req, { scheduleId: record.id, ...comp }),
        { transaction }
      );
    }

    if (options.autoGenerateSchedule !== false) {
      await scheduleService.generateAndPersistSchedule(req, record, transaction);
    }

    return getSchedule(req, record.id, { transaction });
  });
}

module.exports = {
  getSettings,
  updateSettings,
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  cloneSchedule,
  generateSchedule,
  regenerateSchedule,
  generateFromLease,
  COA_CODE_PREFIXES,
  findLeafAccountByPrefixes,
};
