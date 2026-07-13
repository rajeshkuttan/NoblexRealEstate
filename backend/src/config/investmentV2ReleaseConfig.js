'use strict';

/**
 * Investment Management 2.0 RC1 release controls (env-driven).
 */

function envBool(key, defaultValue) {
  const v = process.env[key];
  if (v === undefined || v === '') return defaultValue;
  return !['0', 'false', 'no', 'off'].includes(String(v).toLowerCase());
}

function envNum(key, defaultValue) {
  const n = Number(process.env[key]);
  return Number.isFinite(n) ? n : defaultValue;
}

function envEnum(key, allowed, defaultValue) {
  const raw = String(process.env[key] || defaultValue).toLowerCase();
  return allowed.includes(raw) ? raw : defaultValue;
}

function getInvestmentV2ReleaseConfig() {
  const omsEntryMode = envEnum(
    'INVESTMENT_V2_OMS_ENTRY_MODE',
    ['disabled', 'pilot', 'production'],
    'pilot'
  );
  const legacyEntryMode = envEnum(
    'INVESTMENT_V2_LEGACY_ENTRY_MODE',
    ['enabled', 'restricted', 'read_only', 'disabled'],
    'enabled'
  );

  return {
    enabled: envBool('INVESTMENT_V2_ENABLED', true),
    releaseStage: String(process.env.INVESTMENT_V2_RELEASE_STAGE || 'rc1').toLowerCase(),
    omsEnabled: envBool('INVESTMENT_V2_OMS_ENABLED', true),
    omsEntryMode,
    legacyEntryMode,
    hideTestData: envBool('INVESTMENT_V2_HIDE_TEST_DATA', true),
    marketDataMode: String(process.env.INVESTMENT_V2_MARKET_DATA_MODE || 'manual_import').toLowerCase(),
    sanctionsMode: String(process.env.INVESTMENT_V2_SANCTIONS_MODE || 'provider_reference').toLowerCase(),
    requireReconciliation: envBool('INVESTMENT_V2_REQUIRE_RECONCILIATION', true),
    requirePretradeChecks: envBool('INVESTMENT_V2_REQUIRE_PRETRADE_CHECKS', true),
    allowPeriodReopen: envBool('INVESTMENT_V2_ALLOW_PERIOD_REOPEN', false),
    allowProductionSeed: envBool('INVESTMENT_V2_ALLOW_PRODUCTION_SEED', false),
    qtyTolerance: envNum('INVESTMENT_V2_QTY_TOLERANCE', 0.000001),
    amountTolerance: envNum('INVESTMENT_V2_AMOUNT_TOLERANCE', 0.01),
    releaseAmountTolerance: envNum('INVESTMENT_V2_RELEASE_AMOUNT_TOLERANCE', 0.01),
    releaseQtyTolerance: envNum('INVESTMENT_V2_RELEASE_QTY_TOLERANCE', 0.000001),
    maxUnresolvedMinor: envNum('INVESTMENT_V2_RELEASE_MAX_UNRESOLVED_MINOR', 10),
    maxUnresolvedMajor: envNum('INVESTMENT_V2_RELEASE_MAX_UNRESOLVED_MAJOR', 0),
    maxUnresolvedCritical: envNum('INVESTMENT_V2_RELEASE_MAX_UNRESOLVED_CRITICAL', 0),
  };
}

function isOmsWriteAllowed() {
  const cfg = getInvestmentV2ReleaseConfig();
  if (!cfg.enabled || !cfg.omsEnabled) return false;
  return cfg.omsEntryMode === 'pilot' || cfg.omsEntryMode === 'production';
}

function isOmsPilotOnly() {
  return getInvestmentV2ReleaseConfig().omsEntryMode === 'pilot';
}

function isLegacyWriteAllowed() {
  const mode = getInvestmentV2ReleaseConfig().legacyEntryMode;
  return mode === 'enabled' || mode === 'restricted';
}

function isLegacyReadOnly() {
  const mode = getInvestmentV2ReleaseConfig().legacyEntryMode;
  return mode === 'read_only' || mode === 'disabled';
}

function publicReleaseStatus() {
  const cfg = getInvestmentV2ReleaseConfig();
  return {
    enabled: cfg.enabled,
    releaseStage: cfg.releaseStage,
    omsEnabled: cfg.omsEnabled,
    omsEntryMode: cfg.omsEntryMode,
    legacyEntryMode: cfg.legacyEntryMode,
    marketDataMode: cfg.marketDataMode,
    sanctionsMode: cfg.sanctionsMode,
    hideTestData: cfg.hideTestData,
    requirePretradeChecks: cfg.requirePretradeChecks,
    legacyWritable: isLegacyWriteAllowed(),
    omsWritable: isOmsWriteAllowed(),
    omsPilotOnly: isOmsPilotOnly(),
  };
}

module.exports = {
  getInvestmentV2ReleaseConfig,
  isOmsWriteAllowed,
  isOmsPilotOnly,
  isLegacyWriteAllowed,
  isLegacyReadOnly,
  publicReleaseStatus,
};
