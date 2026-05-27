const { CompanyFinancialYear, CompanyFinancialPeriod } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

exports.list = async (req, res, next) => {
  try {
    const rows = await CompanyFinancialYear.findAll({
      where: companyWhere(req),
      order: [['startDate', 'DESC']],
      include: [{ model: CompanyFinancialPeriod, as: 'periods' }],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { yearName, startDate, endDate, isCurrent } = req.body;
    if (isCurrent) {
      await CompanyFinancialYear.update(
        { isCurrent: false },
        { where: { companyId: req.companyId } }
      );
    }
    const year = await CompanyFinancialYear.create({
      companyId: req.companyId,
      yearName,
      startDate,
      endDate,
      isCurrent: !!isCurrent,
      isClosed: false,
    });
    await CompanyFinancialPeriod.create({
      financialYearId: year.id,
      companyId: req.companyId,
      periodNo: 1,
      startDate,
      endDate,
      status: 'OPEN',
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINANCIAL_YEAR_OPENED,
      entityId: req.companyId,
      metadata: { financial_year_id: year.id, year_name: yearName },
    });
    res.status(201).json({ success: true, data: year });
  } catch (e) {
    next(e);
  }
};

exports.close = async (req, res, next) => {
  try {
    const year = await CompanyFinancialYear.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!year) return res.status(404).json({ success: false, message: 'Not found' });
    await year.update({ isClosed: true, isCurrent: false });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.FINANCIAL_YEAR_CLOSED,
      entityId: req.companyId,
      metadata: { financial_year_id: year.id },
    });
    res.json({ success: true, data: year });
  } catch (e) {
    next(e);
  }
};
