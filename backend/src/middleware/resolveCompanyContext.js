const {
  COMPANY_HEADER,
  parseHeaderCompanyId,
  resolveActiveCompany,
} = require('../services/companyContextService');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');

const resolveCompanyContext = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const headerId = parseHeaderCompanyId(req.headers[COMPANY_HEADER]);
    const { companyId, company } = await resolveActiveCompany(req.user.id, headerId);

    req.companyId = companyId;
    req.company = company;
    next();
  } catch (error) {
    if (error.statusCode === 403 && !req._companyAccessDeniedLogged) {
      req._companyAccessDeniedLogged = true;
      const headerId = parseHeaderCompanyId(req.headers[COMPANY_HEADER]);
      await logCompanyEvent({
        req,
        action: COMPANY_AUDIT_ACTIONS.COMPANY_ACCESS_DENIED,
        entityId: error.requestedCompanyId || headerId || 0,
        metadata: {
          requested_company_id: error.requestedCompanyId || headerId,
          reason: error.message,
        },
      });
    }
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Company context error',
    });
  }
};

module.exports = { resolveCompanyContext, COMPANY_HEADER };
