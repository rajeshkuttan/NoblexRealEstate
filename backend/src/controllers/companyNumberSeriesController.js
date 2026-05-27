const { CompanyNumberSeries } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const companyDocumentNumber = require('../services/companyDocumentNumber.service');
const { seedMissingNumberSeries } = require('../services/companyNumberSeriesSeed.service');

exports.list = async (req, res, next) => {
  try {
    const rows = await CompanyNumberSeries.findAll({
      where: companyWhere(req),
      order: [['documentType', 'ASC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const row = await CompanyNumberSeries.create({
      ...req.body,
      companyId: req.companyId,
      documentType: companyDocumentNumber.resolveDocumentType(req.body.documentType),
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.NUMBER_SERIES_CREATED,
      entityId: req.companyId,
      metadata: { series_id: row.id, document_type: row.documentType },
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const row = await CompanyNumberSeries.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    await row.update(req.body);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.NUMBER_SERIES_UPDATED,
      entityId: req.companyId,
      metadata: { series_id: row.id },
    });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.seedDefaults = async (req, res, next) => {
  try {
    const result = await seedMissingNumberSeries(req.companyId);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.NUMBER_SERIES_CREATED,
      entityId: req.companyId,
      metadata: { seed_defaults: true, created: result.created },
    });
    const rows = await CompanyNumberSeries.findAll({
      where: { companyId: req.companyId },
      order: [['documentType', 'ASC']],
    });
    res.json({
      success: true,
      data: { ...result, series: rows },
    });
  } catch (e) {
    next(e);
  }
};

exports.preview = async (req, res, next) => {
  try {
    const documentType = req.query.documentType || req.body.documentType;
    const number = await companyDocumentNumber.previewDocumentNumber(
      req.companyId,
      documentType
    );
    res.json({ success: true, data: { preview: number } });
  } catch (e) {
    next(e);
  }
};
