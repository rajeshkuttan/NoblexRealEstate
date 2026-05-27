const { PayrollLeaveOpeningBalance, LeaveType, Employee } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { approveOpeningBalance } = require('../services/payroll/payrollLeaveBalanceService');

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    if (req.query.balance_year) where.balanceYear = req.query.balance_year;
    const rows = await PayrollLeaveOpeningBalance.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] },
        { model: LeaveType, as: 'leaveType' },
      ],
      order: [['balanceYear', 'DESC'], ['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    await assertEmployeeInCompany(body.employee_id, req);
    const lt = await assertRecordInCompany(LeaveType, body.leave_type_id, req);
    const available =
      Number(body.opening_days || 0) + Number(body.adjusted_days || 0) - Number(body.used_days || 0);
    const row = await PayrollLeaveOpeningBalance.create(
      withCompanyId(req, {
        employeeId: body.employee_id,
        leaveTypeId: body.leave_type_id,
        balanceYear: body.balance_year,
        openingDays: body.opening_days || 0,
        usedDays: body.used_days || 0,
        adjustedDays: body.adjusted_days || 0,
        availableDays: available,
        status: 'DRAFT',
        createdBy: req.user?.id,
      })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollLeaveOpeningBalance, req.params.id, req);
    await approveOpeningBalance(row, req.user?.id);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.LEAVE_OPENING_BALANCE_APPROVED,
      entityId: req.companyId,
      metadata: { record_id: row.id, employee_id: row.employeeId },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};
