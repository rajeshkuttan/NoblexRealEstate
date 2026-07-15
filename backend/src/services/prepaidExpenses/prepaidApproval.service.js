'use strict';

const { PrepaidExpense, sequelize } = require('../../models');
const { assertRecordInCompany } = require('../../utils/companyScope');

const WORKFLOW = {
  submit: { from: ['DRAFT', 'SCHEDULE_GENERATED'], to: 'SUBMITTED', approval: 'SUBMITTED' },
  approve: { from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'APPROVED', approval: 'APPROVED', activate: false },
  reject: { from: ['SUBMITTED', 'UNDER_REVIEW'], to: 'DRAFT', approval: 'REJECTED' },
  activate: { from: ['APPROVED'], to: 'ACTIVE', approval: 'APPROVED' },
  suspend: { from: ['ACTIVE', 'PARTIALLY_RECOGNIZED'], to: 'SUSPENDED' },
  resume: { from: ['SUSPENDED'], to: 'ACTIVE' },
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
    const err = new Error(`Cannot ${action} prepaid expense in status ${record.status}`);
    err.statusCode = 400;
    throw err;
  }
  return rule;
}

async function runWorkflow(req, id, action, extra = {}) {
  return sequelize.transaction(async (transaction) => {
    const record = await assertRecordInCompany(PrepaidExpense, id, req, { transaction });
    const rule = assertTransition(action, record);

    if (action === 'approve') {
      // Spec §16 maker-checker: creator/submitter cannot self-approve.
      // Override available with module:prepaid_expenses:admin (system admin roles include it).
      const hasAdmin = Array.isArray(req.userPermissions)
        && req.userPermissions.includes('module:prepaid_expenses:admin');

      if (!hasAdmin) {
        if (record.createdBy && record.createdBy === req.user?.id) {
          const err = new Error(
            'Maker-checker: the creator cannot approve this prepaid. Sign in as a different user with approve permission (or prepaid admin).'
          );
          err.statusCode = 403;
          throw err;
        }
        if (record.submittedBy && record.submittedBy === req.user?.id) {
          const err = new Error(
            'Maker-checker: the submitter cannot approve this prepaid. Sign in as a different user with approve permission (or prepaid admin).'
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
      updates.reviewedBy = req.user?.id;
      if (extra.autoActivate !== false) {
        updates.status = 'ACTIVE';
      }
    }
    if (action === 'suspend') {
      updates.suspendedFrom = extra.suspendedFrom || new Date().toISOString().slice(0, 10);
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
  suspend: (req, id, extra) => runWorkflow(req, id, 'suspend', extra),
  resume: (req, id) => runWorkflow(req, id, 'resume'),
  terminate: (req, id, extra) => runWorkflow(req, id, 'terminate', extra),
  cancel: (req, id) => runWorkflow(req, id, 'cancel'),
};
