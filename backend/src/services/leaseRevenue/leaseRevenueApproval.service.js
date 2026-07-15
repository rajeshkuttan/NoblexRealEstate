'use strict';

const { LeaseRevenueSchedule, sequelize } = require('../../models');
const { assertRecordInCompany } = require('../../utils/companyScope');

const WORKFLOW = {
  submit: { from: ['DRAFT', 'SCHEDULE_GENERATED'], to: 'SUBMITTED', approval: 'SUBMITTED' },
  approve: { from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'APPROVED', approval: 'APPROVED', activate: false },
  reject: { from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'DRAFT', approval: 'REJECTED' },
  activate: { from: ['APPROVED'], to: 'ACTIVE', approval: 'APPROVED' },
  terminate: { from: ['ACTIVE', 'PARTIALLY_RECOGNIZED', 'SUSPENDED'], to: 'TERMINATED' },
  cancel: { from: ['DRAFT', 'SCHEDULE_GENERATED', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'], to: 'CANCELLED', approval: 'CANCELLED' },
};

function assertTransition(action, record) {
  const rule = WORKFLOW[action];
  if (!rule) {
    const err = new Error(`Unknown workflow action: ${action}`);
    err.statusCode = 400;
    throw err;
  }
  if (!rule.from.includes(record.status)) {
    const err = new Error(`Cannot ${action} lease revenue schedule in status ${record.status}`);
    err.statusCode = 400;
    throw err;
  }
  return rule;
}

async function runWorkflow(req, id, action, extra = {}) {
  return sequelize.transaction(async (transaction) => {
    const record = await assertRecordInCompany(LeaseRevenueSchedule, id, req, { transaction });
    const rule = assertTransition(action, record);

    if (action === 'approve') {
      const hasAdmin = Array.isArray(req.userPermissions)
        && req.userPermissions.includes('module:lease_revenue:admin');

      if (!hasAdmin) {
        if (record.createdBy && record.createdBy === req.user?.id) {
          const err = new Error(
            'Maker-checker: the creator cannot approve this schedule. Sign in as a different user with approve permission (or lease revenue admin).'
          );
          err.statusCode = 403;
          throw err;
        }
        if (record.submittedBy && record.submittedBy === req.user?.id) {
          const err = new Error(
            'Maker-checker: the submitter cannot approve this schedule. Sign in as a different user with approve permission (or lease revenue admin).'
          );
          err.statusCode = 403;
          throw err;
        }
      }
    }

    const updates = { status: rule.to };
    if (rule.approval) updates.approvalStatus = rule.approval;

    if (action === 'submit') {
      updates.submittedBy = req.user?.id;
    }
    if (action === 'approve') {
      updates.approvedBy = req.user?.id;
      if (extra.autoActivate !== false) {
        updates.status = 'ACTIVE';
      }
    }
    if (action === 'terminate') {
      updates.terminatedOn = extra.terminatedOn || extra.effectiveDate || new Date().toISOString().slice(0, 10);
      updates.terminationReason = extra.reason || extra.terminationReason;
    }

    await record.update(updates, { transaction });
    return record.reload({ transaction });
  });
}

module.exports = {
  submit: (req, id) => runWorkflow(req, id, 'submit'),
  approve: (req, id, extra) => runWorkflow(req, id, 'approve', extra),
  reject: (req, id) => runWorkflow(req, id, 'reject'),
  activate: (req, id) => runWorkflow(req, id, 'activate'),
  terminate: (req, id, extra) => runWorkflow(req, id, 'terminate', extra),
  cancel: (req, id) => runWorkflow(req, id, 'cancel'),
};
