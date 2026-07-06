'use strict';

/**
 * Valuation provider config CRUD + registry.
 */
const { InvestmentValuationProviderConfig } = require('../../models');
const { withCompanyId } = require('../../utils/companyScope');
const { ManualValuationProvider } = require('./valuationProviders/ManualValuationProvider');
const { ImportValuationProvider } = require('./valuationProviders/ImportValuationProvider');

const manualProvider = new ManualValuationProvider();
const importProvider = new ImportValuationProvider();

async function getProviderSettings(req) {
  let config = await InvestmentValuationProviderConfig.findOne({
    where: { companyId: req.companyId },
  });
  if (!config) {
    config = await InvestmentValuationProviderConfig.create(
      withCompanyId(req, {
        providerName: 'manual',
        enabled: false,
        supportedAssetClasses: ['equity', 'fixed_income', 'fund', 'commodities'],
        refreshFrequencyMinutes: 1440,
      })
    );
  }
  return config;
}

async function updateProviderSettings(req, data) {
  const config = await getProviderSettings(req);
  await config.update({
    providerName: data.providerName ?? config.providerName,
    enabled: data.enabled != null ? Boolean(data.enabled) : config.enabled,
    apiKeyEnvVar: data.apiKeyEnvVar ?? config.apiKeyEnvVar,
    supportedAssetClasses: data.supportedAssetClasses ?? config.supportedAssetClasses,
    refreshFrequencyMinutes: data.refreshFrequencyMinutes ?? config.refreshFrequencyMinutes,
  });
  return config;
}

async function createValuationViaProvider(req, payload) {
  return manualProvider.createValuation(req, payload);
}

async function importValuationsViaProvider(req, payload) {
  return importProvider.importValuations(req, payload);
}

async function runProviderRefresh(companyId) {
  const config = await InvestmentValuationProviderConfig.findOne({ where: { companyId } });
  if (!config?.enabled) return { skipped: true, reason: 'disabled' };
  await config.update({ lastRunAt: new Date(), lastStatus: 'NOOP — API provider not configured' });
  return { skipped: true, reason: 'api_not_configured' };
}

module.exports = {
  getProviderSettings,
  updateProviderSettings,
  createValuationViaProvider,
  importValuationsViaProvider,
  runProviderRefresh,
};
