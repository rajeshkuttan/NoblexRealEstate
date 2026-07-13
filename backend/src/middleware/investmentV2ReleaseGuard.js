'use strict';

const {
  getInvestmentV2ReleaseConfig,
  isOmsWriteAllowed,
  isOmsPilotOnly,
  isLegacyWriteAllowed,
  isLegacyReadOnly,
} = require('../config/investmentV2ReleaseConfig');

function deny(res, status, message, code) {
  return res.status(status).json({ success: false, message, code });
}

function hasPermission(req, code) {
  const perms = req.userPermissions || req.permissions || [];
  if (Array.isArray(perms) && perms.includes(code)) return true;
  if (req.user?.permissions && Array.isArray(req.user.permissions) && req.user.permissions.includes(code)) {
    return true;
  }
  if (typeof req.hasPermission === 'function') return Boolean(req.hasPermission(code));
  return false;
}

/**
 * Block legacy create/update/post/cancel when LEGACY_ENTRY_MODE is read_only/disabled,
 * unless break-glass permission + reason are provided.
 */
function requireLegacyWrite(req, res, next) {
  if (isLegacyWriteAllowed()) {
    const cfg = getInvestmentV2ReleaseConfig();
    if (cfg.legacyEntryMode === 'restricted') {
      const reason = String(req.body?.legacyEntryReason || req.headers['x-legacy-entry-reason'] || '').trim();
      if (!reason) {
        return deny(
          res,
          400,
          'Legacy investment entry requires a reason when restricted',
          'LEGACY_REASON_REQUIRED'
        );
      }
      req.legacyEntryReason = reason;
    }
    return next();
  }

  if (isLegacyReadOnly()) {
    const emergency = hasPermission(req, 'module:investment:legacy_emergency_entry');
    const reason = String(req.body?.emergencyReason || req.headers['x-legacy-emergency-reason'] || '').trim();
    if (emergency && reason) {
      req.legacyEmergency = { reason, at: new Date().toISOString() };
      return next();
    }
    return deny(
      res,
      403,
      'Legacy investment entry is read-only. Use OMS or request break-glass access.',
      'LEGACY_READ_ONLY'
    );
  }

  return deny(res, 403, 'Legacy investment entry is disabled', 'LEGACY_DISABLED');
}

/**
 * Block OMS write routes when OMS disabled; enforce pilot allow-list.
 */
async function requireOmsWrite(req, res, next) {
  const cfg = getInvestmentV2ReleaseConfig();
  if (!cfg.enabled) {
    return deny(res, 403, 'Investment V2 is disabled', 'INVESTMENT_V2_DISABLED');
  }
  if (!isOmsWriteAllowed()) {
    return deny(res, 403, 'OMS entry is disabled for this release stage', 'OMS_DISABLED');
  }

  if (isOmsPilotOnly()) {
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    try {
      const { InvestmentOmsPilotUser } = require('../models');
      const companyId = req.companyId || req.headers['x-company-id'];
      const userId = req.user?.id || req.userId;
      if (!companyId || !userId) {
        return deny(res, 403, 'OMS pilot requires authenticated company user', 'OMS_PILOT_AUTH');
      }
      const row = await InvestmentOmsPilotUser.findOne({
        where: { companyId: Number(companyId), userId: Number(userId), isActive: true },
      });
      if (!row) {
        // System admins with update permission may manage pilot without list during bootstrap
        if (hasPermission(req, 'module:investment:update') && String(req.headers['x-oms-pilot-bypass'] || '') === '1') {
          return next();
        }
        return deny(
          res,
          403,
          'OMS is in pilot mode — user is not on the allow-list',
          'OMS_PILOT_DENIED'
        );
      }
    } catch (err) {
      // Table may not exist yet before migration — allow in non-production for bootstrap
      if (process.env.NODE_ENV === 'production') {
        return deny(res, 503, 'OMS pilot allow-list unavailable', 'OMS_PILOT_UNAVAILABLE');
      }
      return next();
    }
  }

  return next();
}

function attachReleaseStatus(req, res, next) {
  req.investmentV2Release = getInvestmentV2ReleaseConfig();
  return next();
}

module.exports = {
  requireLegacyWrite,
  requireOmsWrite,
  attachReleaseStatus,
  hasPermission,
};
