const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { CompanySetting, AuditLog, User } = require('../models');
const {
  parseHeaderCompanyId,
  getUserCompanies,
  resolveActiveCompany,
  resolveCompanyForLegacySettings,
  assignUserToCompany,
  removeUserFromCompany,
  listCompanyUsers,
  setUserDefaultCompany,
  setUserDefaultCompanyForCompany,
  assertCanDeactivateCompany,
  switchCompanyForUser,
} = require('../services/companyContextService');
const { logCompanyEvent, COMPANY_AUDIT_ACTIONS } = require('../services/companyAuditService');
const { normalizePagination, createPaginationMeta } = require('../utils/pagination');

function buildDateBoundary(value, endOfDay = false) {
  if (!value) return null;
  const suffix = endOfDay ? 'T23:59:59.999' : 'T00:00:00.000';
  const date = new Date(`${value}${suffix}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function actorContext(req) {
  const headerId = parseHeaderCompanyId(req.headers['x-company-id']);
  return {
    actorUserId: req.user?.id,
    actorActiveCompanyId: headerId ?? req.companyId ?? null,
  };
}

async function loadLegacyCompany(req) {
  const headerId = parseHeaderCompanyId(req.headers['x-company-id']);
  const { company } = await resolveCompanyForLegacySettings(req.user.id, headerId);
  return company;
}

const getMyCompanies = async (req, res, next) => {
  try {
    const companies = await getUserCompanies(req.user.id);
    res.json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
};

const getCurrentCompany = async (req, res, next) => {
  try {
    const company = req.company;
    if (!company) {
      return res.status(400).json({ success: false, message: 'Company context not resolved' });
    }
    res.json({
      success: true,
      data: company,
    });
  } catch (error) {
    next(error);
  }
};

const getAllCompanies = async (req, res, next) => {
  try {
    const companies = await CompanySetting.findAll({
      order: [['companyName', 'ASC']],
    });

    const withCounts = await Promise.all(
      companies.map(async (c) => {
        const userCount = await listCompanyUsers(c.id).then((rows) =>
          rows.filter((r) => r.isActive).length
        );
        return {
          ...c.toJSON(),
          userCount,
        };
      })
    );

    res.json({
      success: true,
      data: withCounts,
    });
  } catch (error) {
    next(error);
  }
};

const getCompanySettings = async (req, res, next) => {
  try {
    const settings = await loadLegacyCompany(req);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found',
      });
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const getCompanyById = async (req, res, next) => {
  try {
    const settings = await CompanySetting.findByPk(req.params.id);
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

const updateCompanySettings = async (req, res, next) => {
  try {
    const updateData = req.body;
    const settings = await loadLegacyCompany(req);

    if (!settings) {
      const created = await CompanySetting.create(updateData);
      await logCompanyEvent({
        req,
        action: COMPANY_AUDIT_ACTIONS.COMPANY_CREATED,
        entityId: created.id,
        metadata: { target_company_id: created.id },
      });
      return res.json({
        success: true,
        message: 'Company settings created successfully',
        data: created,
      });
    }

    const oldValues = settings.toJSON();
    await settings.update(updateData);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_UPDATED,
      entityId: settings.id,
      oldValue: oldValues,
      metadata: { target_company_id: settings.id },
    });

    res.json({
      success: true,
      message: 'Company settings updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const updateCompanyById = async (req, res, next) => {
  try {
    const settings = await CompanySetting.findByPk(req.params.id);
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    const oldValues = settings.toJSON();
    await settings.update(req.body);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_UPDATED,
      entityId: settings.id,
      oldValue: oldValues,
      metadata: { target_company_id: settings.id },
    });
    res.json({
      success: true,
      message: 'Company updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const patchCompanyStatus = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const settings = await CompanySetting.findByPk(companyId);
    if (!settings) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive boolean required' });
    }

    const ctx = actorContext(req);
    if (!isActive) {
      await assertCanDeactivateCompany(companyId, {
        actorUserId: ctx.actorUserId,
        actorActiveCompanyId: ctx.actorActiveCompanyId,
      });
    }

    const oldValues = settings.toJSON();
    await settings.update({ isActive });
    await logCompanyEvent({
      req,
      action: isActive
        ? COMPANY_AUDIT_ACTIONS.COMPANY_ACTIVATED
        : COMPANY_AUDIT_ACTIONS.COMPANY_DEACTIVATED,
      entityId: settings.id,
      oldValue: oldValues,
      metadata: { target_company_id: settings.id, is_active: isActive },
    });

    res.json({ success: true, message: 'Company status updated', data: settings });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const createCompanySettings = async (req, res, next) => {
  try {
    const settingsData = req.body;
    const settings = await CompanySetting.create(settingsData);

    if (req.user) {
      await assignUserToCompany(settings.id, req.user.id, { isDefault: false, isActive: true });
    }

    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_CREATED,
      entityId: settings.id,
      metadata: { target_company_id: settings.id },
    });

    res.status(201).json({
      success: true,
      message: 'Company settings created successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const getCompanyProfile = async (req, res, next) => {
  try {
    const settings = await loadLegacyCompany(req);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company profile not found',
      });
    }

    res.json({
      success: true,
      data: {
        companyName: settings.companyName,
        companyNameArabic: settings.companyNameArabic,
        address: settings.address,
        city: settings.city,
        emirate: settings.emirate,
        phone: settings.phone,
        email: settings.email,
        website: settings.website,
        logo: settings.logo,
        currency: settings.currency,
        timezone: settings.timezone,
        language: settings.language,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateCompanyProfile = async (req, res, next) => {
  try {
    const updateData = req.body;
    const settings = await loadLegacyCompany(req);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found',
      });
    }

    const oldValues = settings.toJSON();
    await settings.update(updateData);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_UPDATED,
      entityId: settings.id,
      oldValue: oldValues,
      metadata: { target_company_id: settings.id, section: 'profile' },
    });

    res.json({
      success: true,
      message: 'Company profile updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const getBusinessInfo = async (req, res, next) => {
  try {
    const settings = await loadLegacyCompany(req);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Business information not found',
      });
    }

    res.json({
      success: true,
      data: {
        tradeLicense: settings.tradeLicense,
        commercialRegister: settings.commercialRegister,
        taxNumber: settings.taxNumber,
        vatNumber: settings.vatNumber,
        fiscalYearStart: settings.fiscalYearStart,
        fiscalYearEnd: settings.fiscalYearEnd,
        businessHours: settings.businessHours,
        socialMedia: settings.socialMedia,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateBusinessInfo = async (req, res, next) => {
  try {
    const updateData = req.body;
    const settings = await loadLegacyCompany(req);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found',
      });
    }

    const oldValues = settings.toJSON();
    await settings.update(updateData);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_UPDATED,
      entityId: settings.id,
      oldValue: oldValues,
      metadata: { target_company_id: settings.id, section: 'business_info' },
    });

    res.json({
      success: true,
      message: 'Business information updated successfully',
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

const uploadCompanyLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No logo file uploaded',
      });
    }

    const relativeUrl = `/uploads/company/${req.file.filename}`;
    const settings = await loadLegacyCompany(req);

    if (!settings) {
      return res.status(404).json({
        success: false,
        message: 'Company settings not found. Save company information first.',
      });
    }

    const oldLogo = settings.logo;
    if (oldLogo && typeof oldLogo === 'string' && oldLogo.startsWith('/uploads/company/')) {
      const oldPath = path.join(__dirname, '../../', oldLogo.replace(/^\//, ''));
      try {
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      } catch (e) {
        // ignore cleanup errors
      }
    }

    await settings.update({ logo: relativeUrl });

    res.json({
      success: true,
      message: 'Logo updated successfully',
      data: { logo: relativeUrl },
    });
  } catch (error) {
    next(error);
  }
};

const getCompanyUsersHandler = async (req, res, next) => {
  try {
    const rows = await listCompanyUsers(req.params.id);
    res.json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

const addCompanyUserHandler = async (req, res, next) => {
  try {
    const userId = req.body.userId ?? req.body.user_id;
    const { roleInCompany, role_in_company, isDefault, is_default } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const ctx = actorContext(req);
    const membership = await assignUserToCompany(req.params.id, userId, {
      roleInCompany: roleInCompany ?? role_in_company,
      isDefault: !!(isDefault ?? is_default),
      ...ctx,
    });
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_USER_ASSIGNED,
      entityId: parseInt(req.params.id, 10),
      metadata: {
        target_company_id: parseInt(req.params.id, 10),
        target_user_id: userId,
        role_in_company: roleInCompany ?? role_in_company,
      },
    });
    res.status(201).json({ success: true, data: membership });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const removeCompanyUserHandler = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    const ctx = actorContext(req);
    await removeUserFromCompany(companyId, userId, ctx);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_USER_REMOVED,
      entityId: companyId,
      metadata: { target_company_id: companyId, target_user_id: userId },
    });
    res.json({ success: true, message: 'User removed from company' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const setDefaultCompanyHandler = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    await setUserDefaultCompany(req.user.id, companyId);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_USER_DEFAULT_CHANGED,
      entityId: companyId,
      metadata: {
        target_company_id: companyId,
        target_user_id: req.user.id,
      },
    });
    res.json({ success: true, message: 'Default company updated' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const setUserDefaultForCompany = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);
    await setUserDefaultCompanyForCompany(companyId, userId);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_USER_DEFAULT_CHANGED,
      entityId: companyId,
      metadata: { target_company_id: companyId, target_user_id: userId },
    });
    res.json({ success: true, message: 'Default company updated for user' });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const switchCompany = async (req, res, next) => {
  try {
    const companyId = parseInt(req.body.company_id ?? req.body.companyId, 10);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, message: 'company_id is required' });
    }
    const company = await switchCompanyForUser(req.user.id, companyId);
    await logCompanyEvent({
      req,
      action: COMPANY_AUDIT_ACTIONS.COMPANY_SWITCHED,
      entityId: companyId,
      metadata: { target_company_id: companyId, target_user_id: req.user.id },
    });
    res.json({ success: true, data: company });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

const getCompanyAudit = async (req, res, next) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    const { action = '', user_id: userId = '', from_date: from = '', to_date: to = '' } = req.query;
    const { page, limit, offset } = normalizePagination(req.query, 20, 100);

    const where = {
      entityType: 'company_settings',
      entityId: companyId,
    };
    if (action) where.action = action;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      const fromDate = buildDateBoundary(from, false);
      const toDate = buildDateBoundary(to, true);
      if (fromDate) where.createdAt[Op.gte] = fromDate;
      if (toDate) where.createdAt[Op.lte] = toDate;
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });

    res.json({
      success: true,
      data: rows,
      pagination: createPaginationMeta(count, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyCompanies,
  getCurrentCompany,
  getAllCompanies,
  getCompanySettings,
  getCompanyById,
  updateCompanySettings,
  updateCompanyById,
  patchCompanyStatus,
  createCompanySettings,
  getCompanyProfile,
  updateCompanyProfile,
  getBusinessInfo,
  updateBusinessInfo,
  uploadCompanyLogo,
  getCompanyUsersHandler,
  addCompanyUserHandler,
  removeCompanyUserHandler,
  setDefaultCompanyHandler,
  setUserDefaultForCompany,
  switchCompany,
  getCompanyAudit,
};
