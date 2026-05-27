const { CompanyVatPeriod } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const vatPeriodService = require('../services/vatPeriodService');

exports.list = async (req, res, next) => {
  try {
    const rows = await CompanyVatPeriod.findAll({
      where: companyWhere(req),
      order: [['startDate', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.open = async (req, res, next) => {
  try {
    const { periodName, startDate, endDate } = req.body;
    const row = await CompanyVatPeriod.create({
      companyId: req.companyId,
      periodName,
      startDate,
      endDate,
      status: 'OPEN',
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.submit = async (req, res, next) => {
  try {
    const row = await vatPeriodService.submitVatPeriod(req, req.params.id);
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
};

exports.lock = async (req, res, next) => {
  try {
    const row = await vatPeriodService.lockVatPeriod(req, req.params.id);
    res.json({ success: true, data: row });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
};
