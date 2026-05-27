const { getEmiratisationMetrics } = require('../services/payroll/emiratisationService');

exports.getMetrics = async (req, res, next) => {
  try {
    const requiredPercent = req.query.required_percent ? Number(req.query.required_percent) : 2;
    const data = await getEmiratisationMetrics(req.companyId, { requiredPercent });
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};
