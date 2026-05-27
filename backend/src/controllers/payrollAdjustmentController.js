const { PayrollMonthlyAdjustment, Employee, PayrollComponent, PayrollPeriod } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
  assertEmployeeInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { assertPayrollPeriodOpen } = require('../services/payroll/payrollRunGuard');

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.payroll_period_id) where.payrollPeriodId = req.query.payroll_period_id;
    if (req.query.status) where.status = req.query.status;
    const rows = await PayrollMonthlyAdjustment.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] },
        { model: PayrollComponent, as: 'component' },
      ],
      order: [['id', 'DESC']],
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
    await assertPayrollPeriodOpen(body.payroll_period_id, req.companyId);
    const row = await PayrollMonthlyAdjustment.create(
      withCompanyId(req, {
        employeeId: body.employee_id,
        payrollPeriodId: body.payroll_period_id,
        adjustmentType: body.adjustment_type,
        componentId: body.component_id,
        amount: body.amount,
        reason: body.reason,
        status: 'DRAFT',
        createdBy: req.user?.id,
      })
    );
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const row = await assertRecordInCompany(PayrollMonthlyAdjustment, req.params.id, req);
    if (!['DRAFT', 'SUBMITTED'].includes(row.status)) {
      return res.status(400).json({ message: 'Cannot approve this adjustment' });
    }
    await assertPayrollPeriodOpen(row.payrollPeriodId, req.companyId);
    await row.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_ADJUSTMENT_APPROVED,
      entityId: req.companyId,
      metadata: { adjustment_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
