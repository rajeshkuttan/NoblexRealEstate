const { Op } = require('sequelize');
const { PayrollRun, PayrollPeriod, PayrollRunEmployee, Employee } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { generatePayroll } = require('../services/payroll/payrollCalculationService');
const { assertRunNotLocked, assertPayrollPeriodOpen, PayrollRunLockedError, LOCKED_RUN_MESSAGE } = require('../services/payroll/payrollRunGuard');

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.payroll_period_id) where.payrollPeriodId = req.query.payroll_period_id;
    const rows = await PayrollRun.findAll({
      where,
      include: [{ model: PayrollPeriod, as: 'payrollPeriod' }],
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
    await assertPayrollPeriodOpen(body.payroll_period_id, req.companyId);
    const last = await PayrollRun.findOne({
      where: { companyId: req.companyId, payrollPeriodId: body.payroll_period_id },
      order: [['runNumber', 'DESC']],
    });
    const active = await PayrollRun.findOne({
      where: {
        companyId: req.companyId,
        payrollPeriodId: body.payroll_period_id,
        runType: body.run_type || 'REGULAR',
        status: { [Op.notIn]: ['REVERSED'] },
      },
    });
    if (active) {
      return res.status(400).json({ message: 'Active run already exists for this period' });
    }
    const run = await PayrollRun.create(
      withCompanyId(req, {
        payrollPeriodId: body.payroll_period_id,
        runNumber: (last?.runNumber || 0) + 1,
        runType: body.run_type || 'REGULAR',
        status: 'DRAFT',
        createdBy: req.user?.id,
      })
    );
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_RUN_CREATED,
      entityId: req.companyId,
      metadata: { run_id: run.id },
    });
    res.status(201).json({ success: true, data: run });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const run = await assertRecordInCompany(PayrollRun, req.params.id, req, {
      include: [
        { model: PayrollPeriod, as: 'payrollPeriod' },
        {
          model: PayrollRunEmployee,
          as: 'employees',
          include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] }],
        },
      ],
    });
    res.json({ success: true, data: run });
  } catch (e) {
    next(e);
  }
};

exports.calculate = async (req, res, next) => {
  try {
    const run = await assertRecordInCompany(PayrollRun, req.params.id, req);
    const result = await generatePayroll({
      companyId: req.companyId,
      payrollRunId: run.id,
      userId: req.user?.id,
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_CALCULATED,
      entityId: req.companyId,
      metadata: { run_id: run.id, processed: result.processed },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const run = await assertRecordInCompany(PayrollRun, req.params.id, req);
    if (run.status !== 'CALCULATED' && run.status !== 'UNDER_REVIEW') {
      return res.status(400).json({ message: 'Only calculated runs can be approved' });
    }
    await run.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_APPROVED,
      entityId: req.companyId,
      metadata: { run_id: run.id },
    });
    res.json({ success: true, data: run });
  } catch (e) {
    next(e);
  }
};

exports.lock = async (req, res, next) => {
  try {
    const run = await assertRecordInCompany(PayrollRun, req.params.id, req);
    if (run.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Only approved runs can be locked' });
    }
    await run.update({ status: 'LOCKED' });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_LOCKED,
      entityId: req.companyId,
      metadata: { run_id: run.id },
    });
    res.json({ success: true, data: run });
  } catch (e) {
    next(e);
  }
};

exports.reverse = async (req, res, next) => {
  try {
    const run = await assertRecordInCompany(PayrollRun, req.params.id, req);
    if (run.status === 'LOCKED') {
      return res.status(403).json({ message: LOCKED_RUN_MESSAGE });
    }
    await run.update({ status: 'REVERSED' });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_REVERSED,
      entityId: req.companyId,
      metadata: { run_id: run.id },
    });
    res.json({ success: true, data: run });
  } catch (e) {
    if (e instanceof PayrollRunLockedError) {
      return res.status(403).json({ message: e.message });
    }
    next(e);
  }
};
