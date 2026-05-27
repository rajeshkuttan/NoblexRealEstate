const { PayrollGpssaConfiguration, Employee } = require('../models');
const { companyWhere, withCompanyId, stripCompanyFromBody } = require('../utils/companyScope');

exports.getConfiguration = async (req, res, next) => {
  try {
    const row = await PayrollGpssaConfiguration.findOne({ where: { companyId: req.companyId } });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.updateConfiguration = async (req, res, next) => {
  try {
    const body = stripCompanyFromBody(req.body);
    let row = await PayrollGpssaConfiguration.findOne({ where: { companyId: req.companyId } });
    const payload = {
      employeeRate: body.employee_rate ?? 0,
      employerRate: body.employer_rate ?? 0,
      governmentRate: body.government_rate ?? 0,
      active: body.active !== undefined ? body.active : true,
    };
    if (row) {
      await row.update(payload);
    } else {
      row = await PayrollGpssaConfiguration.create(withCompanyId(req, payload));
    }
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.eligibilityList = async (req, res, next) => {
  try {
    const rows = await Employee.findAll({
      where: { ...companyWhere(req), status: 'active' },
      attributes: ['id', 'employeeNo', 'employeeName', 'gpssaEligible', 'uaeNational', 'nationality'],
      order: [['employeeNo', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};
