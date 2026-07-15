'use strict';

const Decimal = require('decimal.js');
const { ChartOfAccount } = require('../../models');
const { companyWhere, assertAccountInCompany } = require('../../utils/companyScope');
const calc = require('./prepaidCalculation.service');

const LOCKED_LINE_STATUSES = new Set(['POSTED', 'DRAFT_JV_CREATED', 'REVERSED']);

async function assertCoaForPrepaid(accountId, req, { expectType, label }) {
  await assertAccountInCompany(accountId, req);
  const acct = await ChartOfAccount.findOne({
    where: { id: accountId, ...companyWhere(req), isActive: true },
  });
  if (!acct) {
    const err = new Error(`${label} account not found or inactive`);
    err.statusCode = 400;
    throw err;
  }
  // Header accounts have children; leaf/postable accounts may (and usually do) have a parent.
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

async function validatePrepaidAccounts(req, { prepaidAssetAccountId, expenseAccountId, creditAccountId }) {
  if (!prepaidAssetAccountId || !expenseAccountId) {
    const err = new Error('Prepaid asset and expense accounts are required');
    err.statusCode = 400;
    throw err;
  }
  await assertCoaForPrepaid(prepaidAssetAccountId, req, { expectType: 'asset', label: 'Prepaid asset' });
  await assertCoaForPrepaid(expenseAccountId, req, { expectType: 'expense', label: 'Expense' });
  if (creditAccountId) {
    await assertAccountInCompany(creditAccountId, req);
  }
}

function validateAllocations(allocations = []) {
  if (!allocations.length) return;
  let pctSum = new Decimal(0);
  for (const row of allocations) {
    pctSum = pctSum.plus(row.allocationPercentage || row.allocation_percentage || 0);
  }
  if (!pctSum.equals(100)) {
    const err = new Error(`Allocation percentages must sum to 100 (got ${pctSum.toFixed(4)})`);
    err.statusCode = 400;
    throw err;
  }
}

function validatePrepaidPayload(req, payload, { requireAccounts = true } = {}) {
  validateAmount(payload.totalAmount ?? payload.total_amount);
  validateDates(
    payload.serviceStartDate ?? payload.service_start_date,
    payload.serviceEndDate ?? payload.service_end_date
  );
}

async function validatePrepaidForSave(req, payload) {
  validatePrepaidPayload(req, payload);
  if (payload.prepaidAssetAccountId || payload.expenseAccountId) {
    await validatePrepaidAccounts(req, {
      prepaidAssetAccountId: payload.prepaidAssetAccountId,
      expenseAccountId: payload.expenseAccountId,
      creditAccountId: payload.creditAccountId,
    });
  }
}

function hasLockedScheduleLines(lines = []) {
  return lines.some(
    (l) => l.isLocked || LOCKED_LINE_STATUSES.has(l.postingStatus) || LOCKED_LINE_STATUSES.has(l.posting_status)
  );
}

module.exports = {
  validatePrepaidPayload,
  validatePrepaidForSave,
  validatePrepaidAccounts,
  validateAllocations,
  validateDates,
  validateAmount,
  hasLockedScheduleLines,
  LOCKED_LINE_STATUSES,
};
