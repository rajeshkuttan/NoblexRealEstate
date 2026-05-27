const { Op } = require('sequelize');
const {
  PayrollFinalSettlement,
  PayrollFinalSettlementLine,
  EmployeeSeparation,
  Employee,
} = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { getEffectiveSalaryStructure } = require('../services/payroll/payrollSettlementUtils');

exports.dashboard = async (req, res, next) => {
  try {
    const cw = companyWhere(req);
    const pendingSettlements = await PayrollFinalSettlement.count({
      where: { ...cw, status: { [Op.in]: ['DRAFT', 'CALCULATED', 'UNDER_REVIEW'] } },
    });
    const pendingApprovals = await PayrollFinalSettlement.count({
      where: { ...cw, status: 'CALCULATED' },
    });
    const underSeparation = await EmployeeSeparation.count({
      where: { ...cw, status: { [Op.in]: ['DRAFT', 'SUBMITTED', 'APPROVED'] } },
    });
    const eosLines = await PayrollFinalSettlementLine.findAll({
      where: { ...cw, componentType: 'EOSB' },
      include: [{ model: PayrollFinalSettlement, as: 'settlement' }],
    });
    const eosLiability = eosLines
      .filter((l) => l.settlement && l.settlement.status !== 'CANCELLED')
      .reduce((s, l) => s + Number(l.amount || 0), 0);
    const settlements = await PayrollFinalSettlement.findAll({
      where: { ...cw, status: { [Op.notIn]: ['CANCELLED'] } },
      attributes: ['netSettlement'],
    });
    const totalSettlementAmount = settlements.reduce((s, r) => s + Number(r.netSettlement || 0), 0);

    const exceptions = [];
    const approvedSeparations = await EmployeeSeparation.findAll({
      where: { ...cw, status: 'APPROVED' },
      include: [{ model: Employee, as: 'employee' }],
      limit: 20,
    });
    for (const sep of approvedSeparations) {
      const emp = sep.employee;
      if (!emp?.joiningDate) {
        exceptions.push({ type: 'MISSING_JOINING_DATE', employee_id: sep.employeeId, separation_id: sep.id });
      }
      const structure = await getEffectiveSalaryStructure(req.companyId, sep.employeeId, sep.lastWorkingDay);
      if (!structure) {
        exceptions.push({ type: 'MISSING_SALARY_STRUCTURE', employee_id: sep.employeeId, separation_id: sep.id });
      }
    }

    const negativeNet = await PayrollFinalSettlement.findAll({
      where: { ...cw, netSettlement: { [Op.lt]: 0 }, status: { [Op.ne]: 'CANCELLED' } },
      limit: 10,
    });
    for (const s of negativeNet) {
      exceptions.push({ type: 'NEGATIVE_SETTLEMENT', settlement_id: s.id, net: s.netSettlement });
    }

    res.json({
      success: true,
      data: {
        pending_settlements: pendingSettlements,
        pending_approvals: pendingApprovals,
        employees_under_separation: underSeparation,
        eos_liability: eosLiability,
        total_settlement_amount: totalSettlementAmount,
        exceptions,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.register = async (req, res, next) => {
  try {
    const rows = await PayrollFinalSettlement.findAll({
      where: companyWhere(req),
      include: [
        { model: Employee, as: 'employee', attributes: ['employeeNo', 'employeeName'] },
        { model: PayrollFinalSettlementLine, as: 'lines' },
      ],
      order: [['id', 'DESC']],
      limit: 100,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.eosLiability = async (req, res, next) => {
  try {
    const lines = await PayrollFinalSettlementLine.findAll({
      where: { ...companyWhere(req), componentType: 'EOSB' },
      include: [
        {
          model: PayrollFinalSettlement,
          as: 'settlement',
          include: [{ model: Employee, as: 'employee', attributes: ['employeeNo', 'employeeName'] }],
        },
      ],
    });
    res.json({ success: true, data: lines });
  } catch (e) {
    next(e);
  }
};

exports.leaveEncashment = async (req, res, next) => {
  try {
    const lines = await PayrollFinalSettlementLine.findAll({
      where: { ...companyWhere(req), componentType: 'LEAVE_ENCASHMENT' },
      include: [{ model: PayrollFinalSettlement, as: 'settlement' }],
    });
    res.json({ success: true, data: lines });
  } catch (e) {
    next(e);
  }
};

exports.separations = async (req, res, next) => {
  try {
    const rows = await EmployeeSeparation.findAll({
      where: companyWhere(req),
      include: [{ model: Employee, as: 'employee', attributes: ['employeeNo', 'employeeName'] }],
      order: [['id', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.variance = async (req, res, next) => {
  try {
    const rows = await PayrollFinalSettlement.findAll({
      where: { ...companyWhere(req), status: { [Op.in]: ['CALCULATED', 'APPROVED', 'LOCKED'] } },
      attributes: ['id', 'grossSettlement', 'deductions', 'netSettlement', 'status'],
    });
    const withVariance = rows.filter((r) => {
      const expected = Number(r.grossSettlement) - Number(r.deductions);
      return Math.abs(expected - Number(r.netSettlement)) > 0.01;
    });
    res.json({ success: true, data: withVariance });
  } catch (e) {
    next(e);
  }
};
