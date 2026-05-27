const { validatePayrollCompliance } = require('../services/payroll/payrollComplianceService');

exports.check = async (req, res, next) => {
  try {
    const payrollRunId = req.query.payroll_run_id;
    if (!payrollRunId) {
      return res.status(400).json({ message: 'payroll_run_id is required' });
    }
    const result = await validatePayrollCompliance({
      companyId: req.companyId,
      payrollRunId: Number(payrollRunId),
    });
    res.json({ success: true, data: result });
  } catch (e) {
    next(e);
  }
};
