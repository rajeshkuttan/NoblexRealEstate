const { Op } = require('sequelize');
const { PayrollFinalSettlement, EmployeeSeparation, Employee } = require('../models');
const {
  companyWhere,
  withCompanyId,
  stripCompanyFromBody,
  assertRecordInCompany,
} = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const {
  generateFinalSettlement,
  getSettlementWithLines,
  approveSettlement,
  lockSettlement,
  cancelSettlement,
  assertNoActiveSettlement,
} = require('../services/payroll/payrollFinalSettlementService');

exports.list = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    if (req.query.status) where.status = req.query.status;
    const rows = await PayrollFinalSettlement.findAll({
      where,
      include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'] }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const row = await getSettlementWithLines(req.companyId, req.params.id);
    if (!row) return res.status(404).json({ message: 'Settlement not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const separation = await assertRecordInCompany(EmployeeSeparation, body.separation_id, req);
    if (separation.status !== 'APPROVED') {
      return res.status(400).json({ message: 'Separation must be APPROVED' });
    }
    await assertNoActiveSettlement(req.companyId, separation.id);

    const last = await PayrollFinalSettlement.findOne({
      where: { companyId: req.companyId },
      order: [['settlementNumber', 'DESC']],
    });

    const row = await PayrollFinalSettlement.create(
      withCompanyId(req, {
        employeeId: separation.employeeId,
        separationId: separation.id,
        settlementNumber: (last?.settlementNumber || 0) + 1,
        settlementDate: body.settlement_date || separation.lastWorkingDay,
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

exports.calculate = async (req, res, next) => {
  try {
    const result = await generateFinalSettlement({
      companyId: req.companyId,
      settlementId: Number(req.params.id),
      userId: req.user?.id,
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINAL_SETTLEMENT_GENERATED,
      entityId: req.companyId,
      metadata: { settlement_id: result.settlement.id },
    });
    if (result.eosResult?.amount > 0) {
      await logCompanyEvent({
        req,
        action: COMPANY_AUDIT_ACTIONS.EOS_CALCULATED,
        entityId: req.companyId,
        metadata: { settlement_id: result.settlement.id, amount: result.eosResult.amount },
      });
    }
    if (result.leaveResult?.amount > 0) {
      await logCompanyEvent({
        req,
        action: COMPANY_AUDIT_ACTIONS.LEAVE_ENCASHMENT_CALCULATED,
        entityId: req.companyId,
        metadata: { settlement_id: result.settlement.id, amount: result.leaveResult.amount },
      });
    }
    const full = await getSettlementWithLines(req.companyId, req.params.id);
    res.json({ success: true, data: full });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const row = await approveSettlement(req.companyId, req.params.id, req.user?.id);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINAL_SETTLEMENT_APPROVED,
      entityId: req.companyId,
      metadata: { settlement_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.lock = async (req, res, next) => {
  try {
    const row = await lockSettlement(req.companyId, req.params.id);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINAL_SETTLEMENT_LOCKED,
      entityId: req.companyId,
      metadata: { settlement_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.cancel = async (req, res, next) => {
  try {
    const row = await cancelSettlement(req.companyId, req.params.id);
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
