const { Op } = require('sequelize');
const {
  PayrollRun,
  PayrollFinalSettlement,
  AccountsTrans,
  PayrollAccountConfiguration,
  EmployeeLedgerLine,
  EmployeeLedgerHeader,
  Employee,
} = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { getDashboard, getReconciliation } = require('../services/payroll/payrollReconciliation.service');

exports.dashboard = async (req, res, next) => {
  try {
    const data = await getDashboard(req.companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.reconciliation = async (req, res, next) => {
  try {
    const data = await getReconciliation(req.companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.postingRegister = async (req, res, next) => {
  try {
    const runs = await PayrollRun.findAll({
      where: {
        ...companyWhere(req),
        financePostingStatus: { [Op.in]: ['POSTED', 'REVERSED'] },
      },
      order: [['financePostedAt', 'DESC']],
      limit: 100,
    });
    const settlements = await PayrollFinalSettlement.findAll({
      where: {
        ...companyWhere(req),
        financePostingStatus: { [Op.in]: ['POSTED', 'REVERSED'] },
      },
      order: [['financePostedAt', 'DESC']],
      limit: 100,
    });
    res.json({ success: true, data: { runs, settlements } });
  } catch (e) {
    next(e);
  }
};

exports.employeeLedgerReport = async (req, res, next) => {
  try {
    const where = { ...companyWhere(req) };
    if (req.query.employee_id) where.employeeId = req.query.employee_id;
    const headers = await EmployeeLedgerHeader.findAll({
      where,
      include: [
        { model: Employee, as: 'employee', attributes: ['employeeNo', 'employeeName'] },
        { model: EmployeeLedgerLine, as: 'lines' },
      ],
      limit: 50,
    });
    res.json({ success: true, data: headers });
  } catch (e) {
    next(e);
  }
};

exports.liabilities = async (req, res, next) => {
  try {
    const config = await PayrollAccountConfiguration.findOne({ where: { companyId: req.companyId } });
    let payable = 0;
    if (config?.payrollPayableAccount) {
      const rows = await AccountsTrans.findAll({
        where: { companyId: req.companyId, ledgerId: config.payrollPayableAccount },
      });
      for (const r of rows) payable += Number(r.creditAmount) - Number(r.debitAmount);
    }
    res.json({ success: true, data: { payroll_payable: payable } });
  } catch (e) {
    next(e);
  }
};

exports.eosProvision = async (req, res, next) => {
  try {
    const config = await PayrollAccountConfiguration.findOne({ where: { companyId: req.companyId } });
    res.json({
      success: true,
      data: {
        eos_accrual_enabled: config?.eosAccrualEnabled || false,
        eos_provision_account: config?.eosProvisionAccount,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.loanRecovery = async (req, res, next) => {
  try {
    const rows = await AccountsTrans.findAll({
      where: {
        ...companyWhere(req),
        narration: { [Op.like]: '%Loan recovery%' },
      },
      limit: 200,
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.glReconciliation = async (req, res, next) => {
  try {
    const data = await getReconciliation(req.companyId);
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
