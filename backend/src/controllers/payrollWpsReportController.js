const { Op } = require('sequelize');
const {
  PayrollWpsBatch,
  PayrollWpsEmployeeLine,
  PayrollWpsSifExport,
  PayrollRun,
  PayrollRunEmployee,
  Employee,
  EmployeeBankDetail,
} = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { validatePayrollCompliance } = require('../services/payroll/payrollComplianceService');
const { getEmiratisationMetrics } = require('../services/payroll/emiratisationService');
const { validateUaeIban } = require('../services/payroll/payrollIbanValidator');

exports.dashboard = async (req, res, next) => {
  try {
    const pending = await PayrollWpsBatch.count({
      where: {
        ...companyWhere(req),
        status: { [Op.in]: ['GENERATED', 'UNDER_REVIEW', 'APPROVED'] },
      },
    });
    const errorLines = await PayrollWpsEmployeeLine.count({
      where: { ...companyWhere(req), validationStatus: 'ERROR' },
    });
    const emiratisation = await getEmiratisationMetrics(req.companyId);
    res.json({
      success: true,
      data: {
        pending_batches: pending,
        error_line_count: errorLines,
        emiratisation,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.register = async (req, res, next) => {
  try {
    const batches = await PayrollWpsBatch.findAll({
      where: companyWhere(req),
      include: [{ model: PayrollWpsEmployeeLine, as: 'lines' }],
      order: [['id', 'DESC']],
      limit: 50,
    });
    res.json({ success: true, data: batches });
  } catch (e) {
    next(e);
  }
};

exports.sifHistory = async (req, res, next) => {
  try {
    const rows = await PayrollWpsSifExport.findAll({
      where: companyWhere(req),
      order: [['exportedAt', 'DESC']],
      limit: 100,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.complianceExceptions = async (req, res, next) => {
  try {
    const payrollRunId = req.query.payroll_run_id;
    if (!payrollRunId) return res.status(400).json({ message: 'payroll_run_id is required' });
    const result = await validatePayrollCompliance({
      companyId: req.companyId,
      payrollRunId: Number(payrollRunId),
    });
    const errors = result.issues.filter((i) => i.severity === 'ERROR' || i.severity === 'WARNING');
    res.json({ success: true, data: errors });
  } catch (e) {
    next(e);
  }
};

exports.bankValidation = async (req, res, next) => {
  try {
    const banks = await EmployeeBankDetail.findAll({
      where: { ...companyWhere(req), wpsEnabled: true },
    });
    const empIds = [...new Set(banks.map((b) => b.employeeId))];
    const employees = await Employee.findAll({
      where: { id: { [Op.in]: empIds }, companyId: req.companyId },
      attributes: ['id', 'employeeNo', 'employeeName'],
    });
    const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));
    const results = banks.map((b) => {
      const check = validateUaeIban(b.iban);
      const emp = empMap[b.employeeId];
      return {
        employee_id: b.employeeId,
        employee_no: emp?.employeeNo,
        iban: b.iban,
        valid: check.valid,
        message: check.message,
      };
    });
    res.json({ success: true, data: results });
  } catch (e) {
    next(e);
  }
};

exports.emiratisationReport = async (req, res, next) => {
  try {
    const data = await getEmiratisationMetrics(req.companyId, {
      requiredPercent: req.query.required_percent ? Number(req.query.required_percent) : 2,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.gpssaEligibility = async (req, res, next) => {
  try {
    const rows = await Employee.findAll({
      where: { ...companyWhere(req), gpssaEligible: true, status: 'active' },
      attributes: ['id', 'employeeNo', 'employeeName', 'gpssaEligible', 'uaeNational'],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
