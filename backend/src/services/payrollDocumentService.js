const { Op } = require('sequelize');
const { EmployeeDocument, Employee } = require('../models');
const { companyWhere } = require('../utils/companyScope');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('./companyAuditService');

/**
 * Documents expiring within each document's alert_days_before window (or global days cap).
 */
async function listExpiringDocuments(req, { days = 30 } = {}) {
  const maxDays = Math.max(1, parseInt(days, 10) || 30);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + maxDays);

  const docs = await EmployeeDocument.findAll({
    where: {
      ...companyWhere(req),
      expiryDate: { [Op.ne]: null, [Op.lte]: horizon, [Op.gte]: today },
    },
    include: [{ model: Employee, as: 'employee', attributes: ['id', 'employeeNo', 'employeeName'], required: true }],
    order: [['expiryDate', 'ASC']],
  });

  const filtered = docs.filter((d) => {
    const alertDays = d.alertDaysBefore != null ? d.alertDaysBefore : 30;
    const expiry = new Date(d.expiryDate);
    const alertStart = new Date(expiry);
    alertStart.setDate(alertStart.getDate() - alertDays);
    return today >= alertStart && expiry <= horizon;
  });

  if (filtered.length && req) {
    logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.DOCUMENT_EXPIRED,
      entityId: req.companyId,
      metadata: { company_id: req.companyId, count: filtered.length, query_days: maxDays },
    });
  }

  return filtered;
}

module.exports = { listExpiringDocuments };
