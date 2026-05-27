const { getEmployeeLedger } = require('../services/payroll/employeeLedger.service');
const { assertEmployeeInCompany } = require('../utils/companyScope');

exports.getLedger = async (req, res, next) => {
  try {
    const employeeId = req.query.employee_id;
    if (!employeeId) return res.status(400).json({ message: 'employee_id is required' });
    await assertEmployeeInCompany(employeeId, req);
    const header = await getEmployeeLedger(req.companyId, Number(employeeId));
    res.json({ success: true, data: header });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
