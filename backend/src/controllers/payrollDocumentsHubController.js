const {
  getDashboard,
  payrollHistory,
  payrollTrend,
  payrollCostSummary,
} = require('../services/payroll/payrollDocumentsHub.service');
const { PayrollPayslip, PayrollExport } = require('../models');
const { Op } = require('sequelize');
const { companyWhere } = require('../utils/companyScope');

exports.dashboard = async (req, res, next) => {
  try {
    const data = await getDashboard(req.companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.payslipRegister = async (req, res, next) => {
  try {
    const data = await PayrollPayslip.findAll({
      where: companyWhere(req),
      order: [['id', 'DESC']],
      limit: 200,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.salaryCertificateRegister = async (req, res, next) => {
  try {
    const data = await PayrollExport.findAll({
      where: { ...companyWhere(req), exportType: { [Op.like]: 'CERT_%' } },
      order: [['id', 'DESC']],
      limit: 200,
    });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.payrollHistory = async (req, res, next) => {
  try {
    const data = await payrollHistory(req.companyId, req.query.employee_id);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.payrollTrend = async (req, res, next) => {
  try {
    const data = await payrollTrend(req.companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.payrollCostSummary = async (req, res, next) => {
  try {
    const data = await payrollCostSummary(req.companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
