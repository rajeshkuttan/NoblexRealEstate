const { AuditLog } = require('../models');

const COMPANY_ENTITY_TYPE = 'company_settings';

const COMPANY_AUDIT_ACTIONS = {
  COMPANY_CREATED: 'COMPANY_CREATED',
  COMPANY_UPDATED: 'COMPANY_UPDATED',
  COMPANY_ACTIVATED: 'COMPANY_ACTIVATED',
  COMPANY_DEACTIVATED: 'COMPANY_DEACTIVATED',
  COMPANY_USER_ASSIGNED: 'COMPANY_USER_ASSIGNED',
  COMPANY_USER_REMOVED: 'COMPANY_USER_REMOVED',
  COMPANY_USER_DEFAULT_CHANGED: 'COMPANY_USER_DEFAULT_CHANGED',
  COMPANY_SWITCHED: 'COMPANY_SWITCHED',
  COMPANY_ACCESS_DENIED: 'COMPANY_ACCESS_DENIED',
  CROSS_COMPANY_ACCESS_BLOCKED: 'CROSS_COMPANY_ACCESS_BLOCKED',
  CROSS_COMPANY_FINANCE_ACCESS_BLOCKED: 'CROSS_COMPANY_FINANCE_ACCESS_BLOCKED',
  FINANCE_MASTER_CREATED: 'FINANCE_MASTER_CREATED',
  FINANCE_MASTER_UPDATED: 'FINANCE_MASTER_UPDATED',
  FINANCE_POSTING_CREATED: 'FINANCE_POSTING_CREATED',
  FINANCE_POSTING_REVERSED: 'FINANCE_POSTING_REVERSED',
  CROSS_COMPANY_FINANCE_POSTING_BLOCKED: 'CROSS_COMPANY_FINANCE_POSTING_BLOCKED',
  INVOICE_POSTED: 'INVOICE_POSTED',
  PAYMENT_POSTED: 'PAYMENT_POSTED',
  PDC_DEPOSIT_POSTED: 'PDC_DEPOSIT_POSTED',
  SECURITY_DEPOSIT_POSTED: 'SECURITY_DEPOSIT_POSTED',
  JV_POSTED: 'JV_POSTED',
  VENDOR_INVOICE_POSTED: 'VENDOR_INVOICE_POSTED',
  PURCHASE_INVOICE_POSTED: 'PURCHASE_INVOICE_POSTED',
  BANK_TRANSACTION_POSTED: 'BANK_TRANSACTION_POSTED',
  CROSS_COMPANY_REPORT_ACCESS_BLOCKED: 'CROSS_COMPANY_REPORT_ACCESS_BLOCKED',
  REPORT_GENERATED: 'REPORT_GENERATED',
  REPORT_EXPORTED: 'REPORT_EXPORTED',
  DASHBOARD_VIEWED: 'DASHBOARD_VIEWED',
  VAT_REPORT_GENERATED: 'VAT_REPORT_GENERATED',
  NUMBER_SERIES_CREATED: 'NUMBER_SERIES_CREATED',
  NUMBER_SERIES_UPDATED: 'NUMBER_SERIES_UPDATED',
  FINANCIAL_YEAR_OPENED: 'FINANCIAL_YEAR_OPENED',
  FINANCIAL_YEAR_CLOSED: 'FINANCIAL_YEAR_CLOSED',
  PERIOD_SOFT_CLOSED: 'PERIOD_SOFT_CLOSED',
  PERIOD_HARD_CLOSED: 'PERIOD_HARD_CLOSED',
  VAT_PERIOD_SUBMITTED: 'VAT_PERIOD_SUBMITTED',
  VAT_PERIOD_LOCKED: 'VAT_PERIOD_LOCKED',
  OPENING_BALANCE_IMPORTED: 'OPENING_BALANCE_IMPORTED',
  SYSTEM_INTEGRITY_SCAN_RUN: 'SYSTEM_INTEGRITY_SCAN_RUN',
  SYSTEM_INTEGRITY_FAILURE: 'SYSTEM_INTEGRITY_FAILURE',
  CROSS_COMPANY_DATA_INTEGRITY_FAILURE: 'CROSS_COMPANY_DATA_INTEGRITY_FAILURE',
  NUMBERING_CONFLICT_FOUND: 'NUMBERING_CONFLICT_FOUND',
  PERIOD_VIOLATION_FOUND: 'PERIOD_VIOLATION_FOUND',
  VAT_PERIOD_VIOLATION: 'VAT_PERIOD_VIOLATION',
  PERMISSION_AUDIT_FAILURE: 'PERMISSION_AUDIT_FAILURE',
};

/**
 * @param {object} params
 * @param {import('express').Request} [params.req]
 * @param {string} params.action
 * @param {number} params.entityId - company_settings.id
 * @param {object} [params.oldValue]
 * @param {object} [params.metadata]
 * @param {number} [params.actorUserId] - when req.user unavailable
 */
async function logCompanyEvent({ req, action, entityId, oldValue = null, metadata = {}, actorUserId }) {
  try {
    const userId = actorUserId ?? req?.user?.id;
    if (!userId) return;

    const companyId = metadata.company_id ?? entityId;
    const newValue = {
      module: 'company_settings',
      company_id: companyId,
      target_company_id: metadata.target_company_id ?? entityId,
      target_user_id: metadata.target_user_id ?? null,
      route: metadata.route ?? req?.originalUrl ?? req?.url ?? null,
      method: metadata.method ?? req?.method ?? null,
      reason: metadata.reason ?? null,
      ...metadata,
    };

    await AuditLog.create({
      entityType: COMPANY_ENTITY_TYPE,
      entityId,
      action,
      oldValue,
      newValue,
      userId,
      ipAddress: req?.ip ?? metadata.ip_address ?? null,
      userAgent: req?.headers?.['user-agent'] ?? metadata.user_agent ?? null,
    });
  } catch (error) {
    console.error('Failed to log company audit entry:', error);
  }
}

module.exports = {
  COMPANY_ENTITY_TYPE,
  COMPANY_AUDIT_ACTIONS,
  logCompanyEvent,
};
