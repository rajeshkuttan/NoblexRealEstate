const { CompanyFinancialPeriod } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { getCurrentPeriodStatus } = require('../services/periodValidationService');

exports.list = async (req, res, next) => {
  try {
    const rows = await CompanyFinancialPeriod.findAll({
      where: companyWhere(req),
      order: [['startDate', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.currentStatus = async (req, res, next) => {
  try {
    const status = await getCurrentPeriodStatus(req, req.query.date);
    res.json({ success: true, data: status });
  } catch (e) {
    next(e);
  }
};

exports.close = async (req, res, next) => {
  try {
    const mode = req.body.mode || 'soft';
    const period = await CompanyFinancialPeriod.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!period) return res.status(404).json({ success: false, message: 'Not found' });

    const status = mode === 'hard' ? 'HARD_CLOSED' : 'SOFT_CLOSED';
    await period.update({
      status,
      closedBy: req.user?.id || null,
      closedAt: new Date(),
    });

    await logCompanyEvent({
      req,
      action:
        status === 'HARD_CLOSED'
          ? COMPANY_AUDIT_ACTIONS.PERIOD_HARD_CLOSED
          : COMPANY_AUDIT_ACTIONS.PERIOD_SOFT_CLOSED,
      entityId: req.companyId,
      metadata: { period_id: period.id, status },
    });

    res.json({ success: true, data: period });
  } catch (e) {
    next(e);
  }
};

exports.open = async (req, res, next) => {
  try {
    const period = await CompanyFinancialPeriod.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!period) return res.status(404).json({ success: false, message: 'Not found' });
    await period.update({ status: 'OPEN', closedBy: null, closedAt: null });
    res.json({ success: true, data: period });
  } catch (e) {
    next(e);
  }
};
