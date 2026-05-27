const { CompanyOpeningBalanceBatch } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

exports.list = async (req, res, next) => {
  try {
    const rows = await CompanyOpeningBalanceBatch.findAll({
      where: companyWhere(req),
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: rows });
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { batchName, balanceDate, status } = req.body;
    const row = await CompanyOpeningBalanceBatch.create({
      companyId: req.companyId,
      batchName,
      balanceDate,
      status: status || 'draft',
      createdBy: req.user?.id || null,
    });
    res.status(201).json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const row = await CompanyOpeningBalanceBatch.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!row) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: row });
  } catch (e) {
    next(e);
  }
};

async function assertBatchInCompany(batchId, req) {
  const batch = await CompanyOpeningBalanceBatch.findOne({
    where: { id: batchId, ...companyWhere(req) },
  });
  if (!batch) {
    const err = new Error('Opening balance batch not found for active company');
    err.statusCode = 400;
    throw err;
  }
  return batch;
}

exports.assertBatchInCompany = assertBatchInCompany;

exports.markImported = async (req, res, next) => {
  try {
    const batch = await assertBatchInCompany(req.params.id, req);
    await batch.update({ status: 'posted' });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.OPENING_BALANCE_IMPORTED,
      entityId: req.companyId,
      metadata: { batch_id: batch.id, batch_name: batch.batchName },
    });
    res.json({ success: true, data: batch });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ success: false, message: e.message });
    next(e);
  }
};
