const { PayrollPeriod } = require('../models');
const { companyWhere, withCompanyId, stripCompanyFromBody, assertRecordInCompany } = require('../utils/companyScope');
const { generatePayrollPeriod } = require('../services/payroll/payrollPeriodService');
const { LOCKED_PERIOD_MESSAGE } = require('../services/payroll/payrollRunGuard');

exports.list = async (req, res, next) => {
  try {
    const rows = await PayrollPeriod.findAll({
      where: companyWhere(req),
      order: [['periodYear', 'DESC'], ['periodMonth', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.generate = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    const month = Number(body.period_month || body.month);
    const year = Number(body.period_year || body.year);
    const period = await generatePayrollPeriod(req.companyId, month, year, req.user?.id);
    res.json({ success: true, data: period });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.approve = async (req, res, next) => {
  try {
    const period = await assertRecordInCompany(PayrollPeriod, req.params.id, req);
    if (period.status === 'LOCKED') {
      return res.status(403).json({ message: LOCKED_PERIOD_MESSAGE });
    }
    await period.update({
      status: 'APPROVED',
      approvedBy: req.user?.id,
      approvedAt: new Date(),
    });
    res.json({ success: true, data: period });
  } catch (e) {
    next(e);
  }
};

exports.lock = async (req, res, next) => {
  try {
    const period = await assertRecordInCompany(PayrollPeriod, req.params.id, req);
    if (period.status === 'LOCKED') {
      return res.status(403).json({ message: LOCKED_PERIOD_MESSAGE });
    }
    await period.update({
      status: 'LOCKED',
      lockedBy: req.user?.id,
      lockedAt: new Date(),
    });
    res.json({ success: true, data: period });
  } catch (e) {
    next(e);
  }
};
