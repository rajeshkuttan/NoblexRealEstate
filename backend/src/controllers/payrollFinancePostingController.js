const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const {
  postPayrollRun,
  reversePayrollRun,
  postSettlement,
  reverseSettlement,
  postWpsClearing,
} = require('../services/payroll/payrollFinancePosting.service');

exports.postRun = async (req, res, next) => {
  try {
    const result = await postPayrollRun({ req, runId: Number(req.params.id) });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_POSTED,
      entityId: req.companyId,
      metadata: { run_id: result.run.id, transaction_no: result.transactionNo },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.reverseRun = async (req, res, next) => {
  try {
    const result = await reversePayrollRun({ req, runId: Number(req.params.id) });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.PAYROLL_POSTING_REVERSED,
      entityId: req.companyId,
      metadata: { run_id: result.run.id },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.postSettlement = async (req, res, next) => {
  try {
    const result = await postSettlement({ req, settlementId: Number(req.params.id) });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.SETTLEMENT_POSTED,
      entityId: req.companyId,
      metadata: { settlement_id: result.settlement.id, transaction_no: result.transactionNo },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.reverseSettlement = async (req, res, next) => {
  try {
    const result = await reverseSettlement({ req, settlementId: Number(req.params.id) });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.SETTLEMENT_REVERSED,
      entityId: req.companyId,
      metadata: { settlement_id: result.settlement.id },
    });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};

exports.postWpsClear = async (req, res, next) => {
  try {
    const result = await postWpsClearing({ req, batchId: Number(req.params.id) });
    res.json({ success: true, data: result });
  } catch (e) {
    if (e.statusCode) return res.status(e.statusCode).json({ message: e.message });
    next(e);
  }
};
