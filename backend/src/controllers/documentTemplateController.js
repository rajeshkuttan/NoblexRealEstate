const { CompanyDocumentTemplate } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const documentTemplateService = require('../services/documentTemplateService');

exports.list = async (req, res, next) => {
  try {
    const rows = await CompanyDocumentTemplate.findAll({ where: companyWhere(req) });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.resolve = async (req, res, next) => {
  try {
    const documentType = req.params.documentType || req.query.documentType;
    const data = await documentTemplateService.getTemplate(
      req.companyId,
      documentType,
      req.company
    );
    res.json({ success: true, data });
  } catch (e) {
    next(e);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const documentType = req.body.documentType;
    let row = await CompanyDocumentTemplate.findOne({
      where: { companyId: req.companyId, documentType },
    });
    if (row) {
      await row.update(req.body);
    } else {
      row = await CompanyDocumentTemplate.create({
        ...req.body,
        companyId: req.companyId,
        documentType,
      });
    }
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};
