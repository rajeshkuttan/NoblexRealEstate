'use strict';

const Decimal = require('decimal.js');
const { ChartOfAccount } = require('../../models');
const { companyWhere, assertAccountInCompany } = require('../../utils/companyScope');
const calc = require('./leaseRevenueCalculation.service');

const LOCKED_LINE_STATUSES = new Set(['POSTED', 'DRAFT_JV_CREATED', 'REVERSED']);

async function assertCoaForRevenue(accountId, req, { expectType, label }) {
  await assertAccountInCompany(accountId, req);
  const acct = await ChartOfAccount.findOne({
    where: { id: accountId, ...companyWhere(req), isActive: true },
  });
  if (!acct) {
    const err = new Error(`${label} account not found or inactive`);
    err.statusCode = 400;
    throw err;
  }
  const childCount = await ChartOfAccount.count({
    where: { parentAccountId: accountId, ...companyWhere(req) },
  });
  if (childCount > 0) {
    const err = new Error(
      `${label} account cannot be a header/parent account — select a postable leaf account`
    );
    err.statusCode = 400;
    throw err;
  }
  if (expectType && acct.accountType !== expectType) {
    const err = new Error(`${label} account must be type ${expectType}`);
    err.statusCode = 400;
    throw err;
  }
  return acct;
}

function validateDates(start, end) {
  if (!start || !end) {
    const err = new Error('Service start and end dates are required');
    err.statusCode = 400;
    throw err;
  }
  if (calc.parseDateOnly(end) < calc.parseDateOnly(start)) {
    const err = new Error('Service end date must be on or after start date');
    err.statusCode = 400;
    throw err;
  }
}

function validateAmount(amount) {
  const amt = new Decimal(amount || 0);
  if (amt.lte(0)) {
    const err = new Error('Total amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }
}

async function validateRevenueAccounts(req, payload) {
  const {
    revenueAccountId,
    deferredRevenueAccountId,
    accruedRevenueAccountId,
    revenueModel,
  } = payload;

  if (!revenueAccountId) {
    const err = new Error('Revenue account is required');
    err.statusCode = 400;
    throw err;
  }
  await assertCoaForRevenue(revenueAccountId, req, { expectType: 'revenue', label: 'Revenue' });

  const model = revenueModel || 'DEFERRED';
  if (model === 'DEFERRED') {
    if (!deferredRevenueAccountId) {
      const err = new Error('Deferred revenue account is required for DEFERRED model');
      err.statusCode = 400;
      throw err;
    }
    await assertCoaForRevenue(deferredRevenueAccountId, req, {
      expectType: 'liability',
      label: 'Deferred revenue',
    });
  }
  if (model === 'ACCRUED' && accruedRevenueAccountId) {
    await assertCoaForRevenue(accruedRevenueAccountId, req, {
      expectType: 'asset',
      label: 'Accrued revenue',
    });
  }
}

function validateSchedulePayload(req, payload) {
  validateAmount(payload.totalContractAmount ?? payload.total_contract_amount);
  validateDates(
    payload.serviceStartDate ?? payload.service_start_date,
    payload.serviceEndDate ?? payload.service_end_date
  );
}

async function validateScheduleForSave(req, payload) {
  validateSchedulePayload(req, payload);
  if (payload.revenueAccountId || payload.deferredRevenueAccountId || payload.accruedRevenueAccountId) {
    await validateRevenueAccounts(req, payload);
  }
}

function hasLockedScheduleLines(lines = []) {
  return lines.some(
    (l) => l.isLocked || LOCKED_LINE_STATUSES.has(l.postingStatus) || LOCKED_LINE_STATUSES.has(l.posting_status)
  );
}

module.exports = {
  validateSchedulePayload,
  validateScheduleForSave,
  validateRevenueAccounts,
  validateDates,
  validateAmount,
  hasLockedScheduleLines,
  LOCKED_LINE_STATUSES,
  assertCoaForRevenue,
};
