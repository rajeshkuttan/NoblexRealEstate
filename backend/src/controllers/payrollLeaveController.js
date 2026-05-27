const {
  LeaveType,
  LeavePolicy,
  LeavePolicyRule,
  LeavePolicyAssignment,
  Employee,
} = require('../models');
const { makeCrudHandlers } = require('../utils/payrollCrud');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

const leaveTypeCrud = makeCrudHandlers(LeaveType, { searchFields: ['leaveCode', 'leaveName'] });

exports.listLeaveTypes = leaveTypeCrud.list;
exports.getLeaveType = leaveTypeCrud.getById;
exports.createLeaveType = leaveTypeCrud.create;
exports.updateLeaveType = leaveTypeCrud.update;
exports.removeLeaveType = leaveTypeCrud.remove;

exports.listPolicies = async (req, res, next) => {
  try {
    const rows = await LeavePolicy.findAll({
      where: companyWhere(req),
      include: [
        { model: LeaveType, as: 'leaveType' },
        { model: LeavePolicyRule, as: 'rules' },
      ],
      order: [['policyName', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.createPolicy = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const rules = body.rules;
    delete body.rules;
    const policy = await LeavePolicy.create(withCompanyId(req, body));
    if (Array.isArray(rules) && rules.length) {
      for (const r of rules) {
        await LeavePolicyRule.create(withCompanyId(req, { ...r, leavePolicyId: policy.id }));
      }
    }
    const full = await LeavePolicy.findOne({
      where: { id: policy.id, ...companyWhere(req) },
      include: [{ model: LeavePolicyRule, as: 'rules' }, { model: LeaveType, as: 'leaveType' }],
    });
    res.status(201).json({ success: true, data: full });
  } catch (e) {
    next(e);
  }
};

exports.updatePolicy = async (req, res, next) => {
  try {
    const policy = await assertRecordInCompany(LeavePolicy, req.params.id, req);
    const body = stripCompanyFromBody(req.body);
    const rules = body.rules;
    delete body.rules;
    await policy.update(body);
    if (Array.isArray(rules)) {
      await LeavePolicyRule.destroy({ where: { leavePolicyId: policy.id, ...companyWhere(req) } });
      for (const r of rules) {
        await LeavePolicyRule.create(withCompanyId(req, { ...r, leavePolicyId: policy.id }));
      }
    }
    const full = await LeavePolicy.findOne({
      where: { id: policy.id, ...companyWhere(req) },
      include: [{ model: LeavePolicyRule, as: 'rules' }, { model: LeaveType, as: 'leaveType' }],
    });
    res.json({ success: true, data: full });
  } catch (e) {
    next(e);
  }
};

exports.assignPolicy = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await assertEmployeeInCompany(body.employeeId, req);
    await assertRecordInCompany(LeavePolicy, body.leavePolicyId, req);
    const row = await LeavePolicyAssignment.create(withCompanyId(req, body));
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.LEAVE_POLICY_ASSIGNED,
      entityId: req.companyId,
      metadata: {
        company_id: req.companyId,
        employee_id: body.employeeId,
        leave_policy_id: body.leavePolicyId,
      },
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.listAssignments = async (req, res, next) => {
  try {
    const where = companyWhere(req);
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    const rows = await LeavePolicyAssignment.findAll({
      where,
      include: [
        { model: LeavePolicy, as: 'leavePolicy', include: [{ model: LeaveType, as: 'leaveType' }] },
        { model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] },
      ],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
