const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/authMiddleware');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const {
  requireLegacyWrite,
  requireOmsWrite,
  attachReleaseStatus,
} = require('../middleware/investmentV2ReleaseGuard');
const ctrl = require('../controllers/investmentModuleController');

const router = express.Router();

router.use(authMiddleware);
router.use(resolveCompanyContext);
router.use(attachReleaseStatus);

router.get('/v2/release-status', requirePermission('module:investment:view'), ctrl.getInvestmentV2ReleaseStatus);
router.get('/v2/oms-pilot-users', requirePermission('module:investment:update'), ctrl.listOmsPilotUsers);
router.post('/v2/oms-pilot-users', requirePermission('module:investment:update'), ctrl.upsertOmsPilotUser);
router.delete('/v2/oms-pilot-users/:id', requirePermission('module:investment:update'), ctrl.removeOmsPilotUser);

router.get('/dashboard', requirePermission('module:investment:view'), ctrl.getDashboard);
router.get('/portfolio', requirePermission('module:investment:view'), ctrl.getPortfolio);

router.get('/categories', requirePermission('module:investment:view'), ctrl.listCategories);
router.post('/categories', requirePermission('module:investment:create'), ctrl.createCategory);
router.put('/categories/:id', requirePermission('module:investment:update'), ctrl.updateCategory);
router.delete('/categories/:id', requirePermission('module:investment:delete'), ctrl.deleteCategory);
router.post('/categories/:id/restore', requirePermission('module:investment:update'), ctrl.restoreCategory);
router.get('/partners', requirePermission('module:investment:view'), ctrl.listPartners);

router.post('/assets', requirePermission('module:investment:create'), ctrl.createAsset);
router.get('/assets/:id', requirePermission('module:investment:view'), ctrl.getAsset);
router.put('/assets/:id', requirePermission('module:investment:update'), ctrl.updateAsset);
router.delete('/assets/:id', requirePermission('module:investment:delete'), ctrl.deleteAsset);
router.post('/assets/:id/archive', requirePermission('module:investment:update'), ctrl.archiveAsset);
router.post('/assets/:id/restore', requirePermission('module:investment:update'), ctrl.restoreAsset);
router.post('/assets/:id/clone', requirePermission('module:investment:create'), ctrl.cloneAsset);

router.get('/assets/:id/transactions', requirePermission('module:investment:view'), ctrl.getAssetTransactions);
router.post('/transactions', requirePermission('module:investment:create'), requireLegacyWrite, ctrl.createTransaction);
router.get('/transactions', requirePermission('module:investment:view'), ctrl.listTransactions);
router.post('/transactions/bulk-approve', requirePermission('module:investment:approve'), requireLegacyWrite, ctrl.bulkApproveTransactions);
router.post('/transactions/bulk-reject', requirePermission('module:investment:approve'), requireLegacyWrite, ctrl.bulkRejectTransactions);
router.post('/transactions/bulk-post', requirePermission('module:investment:post'), requireLegacyWrite, ctrl.bulkPostTransactions);
router.get('/transactions/:id/ledger', requirePermission('module:investment:view'), ctrl.getTransactionLedger);
router.post('/transactions/:id/approve', requirePermission('module:investment:approve'), requireLegacyWrite, ctrl.approveTransaction);
router.post('/transactions/:id/post', requirePermission('module:investment:post'), requireLegacyWrite, ctrl.postTransaction);
router.post('/transactions/:id/cancel', requirePermission('module:investment:update'), requireLegacyWrite, ctrl.cancelTransaction);
router.post('/transactions/:id/reject', requirePermission('module:investment:approve'), requireLegacyWrite, ctrl.rejectTransaction);
router.post('/transactions/:id/duplicate', requirePermission('module:investment:create'), requireLegacyWrite, ctrl.duplicateTransaction);

router.get('/assets/:id/valuations', requirePermission('module:investment:view'), ctrl.getAssetValuations);
router.post('/valuations', requirePermission('module:investment:valuation'), ctrl.createValuation);
router.post('/valuations/import', requirePermission('module:investment:valuation'), ctrl.importValuations);
router.post('/valuations/:id/approve', requirePermission('module:investment:approve'), ctrl.approveValuation);

router.get('/distributions', requirePermission('module:investment:view'), ctrl.listDistributions);
router.get('/distributions/:id', requirePermission('module:investment:view'), ctrl.getDistribution);
router.post('/distributions/prepare', requirePermission('module:investment:create'), ctrl.prepareDistribution);
router.post('/distributions/:id/approve', requirePermission('module:investment:approve'), ctrl.approveDistribution);
router.post('/distributions/:id/post', requirePermission('module:investment:post'), ctrl.postDistribution);
router.post('/distributions/:id/cancel', requirePermission('module:investment:update'), ctrl.cancelDistribution);

router.get('/assets/:id/allocations', requirePermission('module:investment:view'), ctrl.getAssetAllocations);
router.post('/assets/:id/allocations', requirePermission('module:investment:create'), ctrl.createAllocation);
router.put('/allocations/:id', requirePermission('module:investment:update'), ctrl.updateAllocation);
router.delete('/allocations/:id', requirePermission('module:investment:delete'), ctrl.deleteAllocation);

router.get('/reports/portfolio', requirePermission('module:investment:reports'), ctrl.getReportPortfolio);
router.get('/reports/ledger', requirePermission('module:investment:reports'), ctrl.getReportLedger);
router.get('/reports/dividends', requirePermission('module:investment:reports'), ctrl.getReportDividends);
router.get('/reports/gain-loss', requirePermission('module:investment:reports'), ctrl.getReportGainLoss);
router.get('/reports/valuations', requirePermission('module:investment:reports'), ctrl.getReportValuations);
router.get('/reports/month-end-reconciliation', requirePermission('module:investment:reports'), ctrl.getMonthEndReconciliation);
router.get('/reports/partner-statement/:partnerId', requirePermission('module:investment:partner_statement'), ctrl.getPartnerStatement);

router.get('/settings/accounts', requirePermission('module:investment:view'), ctrl.getAccountSettings);
router.put('/settings/accounts', requirePermission('module:investment:update'), ctrl.updateAccountSettings);
router.get('/settings/valuation-providers', requirePermission('module:investment:view'), ctrl.getValuationProviderSettings);
router.put('/settings/valuation-providers', requirePermission('module:investment:update'), ctrl.updateValuationProviderSettings);

router.post('/assets/:id/documents', requirePermission('module:investment:create'), ctrl.uploadDocument);
router.get('/assets/:id/documents', requirePermission('module:investment:view'), ctrl.getAssetDocuments);
router.delete('/documents/:id', requirePermission('module:investment:delete'), ctrl.deleteDocument);

// Phase 17
router.get('/v2/portfolios', requirePermission('module:investment:view'), ctrl.listPortfoliosV2);
router.post('/v2/portfolios', requirePermission('module:investment:create'), ctrl.createPortfolioV2);
router.get('/v2/portfolios/:id', requirePermission('module:investment:view'), ctrl.getPortfolio360);
router.put('/v2/portfolios/:id', requirePermission('module:investment:update'), ctrl.updatePortfolioV2);

router.get('/v2/instruments', requirePermission('module:investment:view'), ctrl.listInstruments);
router.post('/v2/instruments', requirePermission('module:investment:create'), ctrl.createInstrument);
router.get('/v2/instruments/type-rules', requirePermission('module:investment:view'), ctrl.getInstrumentTypeRules);
router.get('/v2/instruments/:id', requirePermission('module:investment:view'), ctrl.getInstrument360);
router.put('/v2/instruments/:id', requirePermission('module:investment:update'), ctrl.updateInstrument);

router.get('/v2/brokers', requirePermission('module:investment:view'), ctrl.listBrokers);
router.post('/v2/brokers', requirePermission('module:investment:create'), ctrl.createBroker);
router.put('/v2/brokers/:id', requirePermission('module:investment:update'), ctrl.updateBroker);
router.get('/v2/custodians', requirePermission('module:investment:view'), ctrl.listCustodians);
router.post('/v2/custodians', requirePermission('module:investment:create'), ctrl.createCustodian);
router.put('/v2/custodians/:id', requirePermission('module:investment:update'), ctrl.updateCustodian);
router.get('/v2/accounts', requirePermission('module:investment:view'), ctrl.listInvestmentAccounts);
router.post('/v2/accounts', requirePermission('module:investment:create'), ctrl.createInvestmentAccount);

router.post('/v2/migrate-phase17', requirePermission('module:investment:update'), ctrl.runPhase17Migration);

// Phase 18 — orders / trades / settlements
router.get('/v2/orders', requirePermission('module:investment:view'), ctrl.listOrders);
router.post('/v2/orders', requirePermission('module:investment:create'), requireOmsWrite, ctrl.createOrder);
router.get('/v2/orders/:id', requirePermission('module:investment:view'), ctrl.getOrder);
router.put('/v2/orders/:id', requirePermission('module:investment:update'), requireOmsWrite, ctrl.updateOrder);
router.post('/v2/orders/:id/submit', requirePermission('module:investment:update'), requireOmsWrite, ctrl.submitOrder);
router.post('/v2/orders/:id/approve', requirePermission('module:investment:approve'), requireOmsWrite, ctrl.approveOrder);
router.post('/v2/orders/:id/reject', requirePermission('module:investment:approve'), requireOmsWrite, ctrl.rejectOrder);
router.post('/v2/orders/:id/place', requirePermission('module:investment:update'), requireOmsWrite, ctrl.placeOrder);
router.post('/v2/orders/:id/cancel', requirePermission('module:investment:update'), requireOmsWrite, ctrl.cancelOrder);

router.get('/v2/trades', requirePermission('module:investment:view'), ctrl.listTrades);
router.post('/v2/trades', requirePermission('module:investment:create'), requireOmsWrite, ctrl.createTrade);
router.post('/v2/trades/preview', requirePermission('module:investment:view'), ctrl.previewTrade);
router.get('/v2/trades/:id', requirePermission('module:investment:view'), ctrl.getTrade);
router.post('/v2/trades/:id/confirm', requirePermission('module:investment:update'), requireOmsWrite, ctrl.confirmTrade);
router.post('/v2/trades/:id/cancel', requirePermission('module:investment:update'), requireOmsWrite, ctrl.cancelTrade);

router.get('/v2/settlements', requirePermission('module:investment:view'), ctrl.listSettlements);
router.get('/v2/settlements/:id', requirePermission('module:investment:view'), ctrl.getSettlement);
router.post('/v2/settlements/:id/settle', requirePermission('module:investment:update'), requireOmsWrite, ctrl.settleSettlement);
router.post('/v2/settlements/:id/fail', requirePermission('module:investment:update'), requireOmsWrite, ctrl.failSettlement);
router.post('/v2/settlements/:id/cancel', requirePermission('module:investment:update'), requireOmsWrite, ctrl.cancelSettlement);

// Phase 19 — income / corporate actions
router.get('/v2/income', requirePermission('module:investment:view'), ctrl.listIncomeEvents);
router.post('/v2/income', requirePermission('module:investment:create'), ctrl.createIncomeEvent);
router.post('/v2/income/generate-schedule', requirePermission('module:investment:create'), ctrl.generateIncomeSchedule);
router.post('/v2/income/run-accruals', requirePermission('module:investment:update'), ctrl.runIncomeAccruals);
router.get('/v2/income/:id', requirePermission('module:investment:view'), ctrl.getIncomeEvent);
router.post('/v2/income/:id/accrue', requirePermission('module:investment:update'), ctrl.accrueIncome);
router.post('/v2/income/:id/receivable', requirePermission('module:investment:update'), ctrl.markIncomeReceivable);
router.post('/v2/income/:id/receive', requirePermission('module:investment:update'), ctrl.markIncomeReceived);
router.post('/v2/income/:id/reconcile', requirePermission('module:investment:update'), ctrl.reconcileIncome);
router.post('/v2/income/:id/distribute', requirePermission('module:investment:update'), ctrl.distributeIncome);
router.post('/v2/income/:id/reinvest', requirePermission('module:investment:update'), ctrl.reinvestIncome);
router.post('/v2/income/:id/cancel', requirePermission('module:investment:update'), ctrl.cancelIncome);

router.get('/v2/corporate-actions', requirePermission('module:investment:view'), ctrl.listCorporateActions);
router.post('/v2/corporate-actions', requirePermission('module:investment:create'), ctrl.createCorporateAction);
router.get('/v2/corporate-actions/:id', requirePermission('module:investment:view'), ctrl.getCorporateAction);
router.post('/v2/corporate-actions/:id/entitlements', requirePermission('module:investment:update'), ctrl.generateEntitlements);
router.post('/v2/corporate-actions/:id/apply', requirePermission('module:investment:update'), ctrl.applyCorporateAction);
router.post('/v2/corporate-actions/:id/settle', requirePermission('module:investment:update'), ctrl.settleCorporateAction);
router.post('/v2/corporate-actions/:id/cancel', requirePermission('module:investment:update'), ctrl.cancelCorporateAction);

// Phase 20 — investors / capital / distributions
router.get('/v2/investors', requirePermission('module:investment:view'), ctrl.listInvestors);
router.post('/v2/investors', requirePermission('module:investment:create'), ctrl.createInvestor);
router.get('/v2/investors/:id', requirePermission('module:investment:view'), ctrl.getInvestor360);
router.put('/v2/investors/:id', requirePermission('module:investment:update'), ctrl.updateInvestor);
router.get('/v2/investors/:id/statement', requirePermission('module:investment:view'), ctrl.getPartnerStatementV2);

router.get('/v2/commitments', requirePermission('module:investment:view'), ctrl.listCommitments);
router.post('/v2/commitments', requirePermission('module:investment:create'), ctrl.createCommitment);

router.get('/v2/capital-calls', requirePermission('module:investment:view'), ctrl.listCapitalCalls);
router.post('/v2/capital-calls', requirePermission('module:investment:create'), ctrl.createCapitalCall);
router.get('/v2/capital-calls/:id', requirePermission('module:investment:view'), ctrl.getCapitalCall);
router.post('/v2/capital-calls/:id/issue', requirePermission('module:investment:update'), ctrl.issueCapitalCall);
router.post('/v2/capital-call-lines/:lineId/receive', requirePermission('module:investment:update'), ctrl.receiveCapitalCallLine);

router.get('/v2/ownership', requirePermission('module:investment:view'), ctrl.listOwnership);
router.post('/v2/ownership', requirePermission('module:investment:create'), ctrl.setOwnership);

router.get('/v2/capital-accounts', requirePermission('module:investment:view'), ctrl.listCapitalAccounts);
router.post('/v2/capital-accounts', requirePermission('module:investment:create'), ctrl.upsertCapitalAccount);

router.get('/v2/distribution-runs', requirePermission('module:investment:view'), ctrl.listDistributionRuns);
router.post('/v2/distribution-runs', requirePermission('module:investment:create'), ctrl.createDistributionRun);
router.get('/v2/distribution-runs/:id', requirePermission('module:investment:view'), ctrl.getDistributionRun);
router.post('/v2/distribution-runs/:id/calculate', requirePermission('module:investment:update'), ctrl.calculateDistributionRun);
router.post('/v2/distribution-runs/:id/submit', requirePermission('module:investment:update'), ctrl.submitDistributionRun);
router.post('/v2/distribution-runs/:id/approve', requirePermission('module:investment:approve'), ctrl.approveDistributionRun);
router.post('/v2/distribution-runs/:id/pay', requirePermission('module:investment:update'), ctrl.payDistributionRun);
router.post('/v2/distribution-runs/:id/reconcile', requirePermission('module:investment:update'), ctrl.reconcileDistributionRun);
router.post('/v2/distribution-runs/:id/statement', requirePermission('module:investment:update'), ctrl.issueDistributionStatement);

// Phase 21 — valuation / NAV / performance
router.get('/v2/market-prices', requirePermission('module:investment:view'), ctrl.listMarketPrices);
router.post('/v2/market-prices', requirePermission('module:investment:create'), ctrl.upsertMarketPrice);
router.post('/v2/market-prices/import', requirePermission('module:investment:create'), ctrl.importMarketPrices);

router.get('/v2/valuation-batches', requirePermission('module:investment:view'), ctrl.listValuationBatches);
router.post('/v2/valuation-batches', requirePermission('module:investment:create'), ctrl.createValuationBatch);
router.get('/v2/valuation-batches/:id', requirePermission('module:investment:view'), ctrl.getValuationBatch);
router.post('/v2/valuation-batches/:id/validate', requirePermission('module:investment:update'), ctrl.validateValuationBatch);
router.post('/v2/valuation-batches/:id/approve', requirePermission('module:investment:approve'), ctrl.approveValuationBatch);
router.post('/v2/valuation-batches/:id/post', requirePermission('module:investment:post'), ctrl.postValuationBatch);
router.post('/v2/valuation-lines/:lineId/fix', requirePermission('module:investment:update'), ctrl.fixValuationLine);

router.get('/v2/nav', requirePermission('module:investment:view'), ctrl.listNavSnapshots);
router.post('/v2/nav', requirePermission('module:investment:create'), ctrl.computeNav);

router.get('/v2/performance', requirePermission('module:investment:view'), ctrl.listPerformancePeriods);
router.post('/v2/performance', requirePermission('module:investment:create'), ctrl.calculatePerformance);
router.get('/v2/benchmarks', requirePermission('module:investment:view'), ctrl.listBenchmarks);
router.post('/v2/benchmarks', requirePermission('module:investment:create'), ctrl.createBenchmark);

// Phase 22 — reconciliation / period close
router.get('/v2/reconciliation', requirePermission('module:investment:view'), ctrl.listReconBatches);
router.post('/v2/reconciliation', requirePermission('module:investment:create'), ctrl.createReconBatch);
router.post('/v2/reconciliation/preview-match', requirePermission('module:investment:view'), ctrl.previewReconMatch);
router.post('/v2/reconciliation/preview-many-to-one', requirePermission('module:investment:view'), ctrl.previewManyToOne);
router.post('/v2/reconciliation/preview-one-to-many', requirePermission('module:investment:view'), ctrl.previewOneToMany);
router.get('/v2/reconciliation/:id', requirePermission('module:investment:view'), ctrl.getReconBatch);
router.post('/v2/reconciliation/:id/import', requirePermission('module:investment:create'), ctrl.importReconRows);
router.post('/v2/reconciliation/:id/match', requirePermission('module:investment:update'), ctrl.runReconMatch);
router.post('/v2/reconciliation/:id/approve', requirePermission('module:investment:approve'), ctrl.approveReconBatch);
router.post('/v2/reconciliation-lines/:lineId/resolve', requirePermission('module:investment:update'), ctrl.resolveReconLine);

router.get('/v2/close-periods', requirePermission('module:investment:view'), ctrl.listClosePeriods);
router.get('/v2/close-periods/lock-check', requirePermission('module:investment:view'), ctrl.checkPeriodLock);
router.post('/v2/close-periods', requirePermission('module:investment:create'), ctrl.getOrCreateClosePeriod);
router.post('/v2/close-periods/:id/checklist', requirePermission('module:investment:update'), ctrl.updateCloseChecklist);
router.post('/v2/close-periods/:id/close', requirePermission('module:investment:approve'), ctrl.closeInvestmentPeriod);
router.post('/v2/close-periods/:id/reopen', requirePermission('module:investment:approve'), ctrl.reopenInvestmentPeriod);

// Phase 23 — risk / compliance / governance
router.get('/v2/risk-dashboard', requirePermission('module:investment:view'), ctrl.getRiskDashboard);
router.post('/v2/pre-trade/preview', requirePermission('module:investment:view'), ctrl.previewPreTrade);
router.post('/v2/limits/scan', requirePermission('module:investment:update'), ctrl.runLimitScan);

router.get('/v2/mandates', requirePermission('module:investment:view'), ctrl.listMandates);
router.post('/v2/mandates', requirePermission('module:investment:create'), ctrl.createMandate);
router.get('/v2/mandates/:id', requirePermission('module:investment:view'), ctrl.getMandate);
router.put('/v2/mandates/:id', requirePermission('module:investment:update'), ctrl.updateMandate);
router.post('/v2/mandates/:id/activate', requirePermission('module:investment:approve'), ctrl.activateMandate);

router.get('/v2/risk-limits', requirePermission('module:investment:view'), ctrl.listRiskLimits);
router.post('/v2/risk-limits', requirePermission('module:investment:create'), ctrl.createRiskLimit);

router.get('/v2/breaches', requirePermission('module:investment:view'), ctrl.listBreaches);
router.post('/v2/breaches', requirePermission('module:investment:create'), ctrl.createBreach);
router.post('/v2/breaches/:id/override', requirePermission('module:investment:approve'), ctrl.overrideBreach);

router.get('/v2/compliance-checks', requirePermission('module:investment:view'), ctrl.listComplianceChecks);
router.post('/v2/compliance-checks', requirePermission('module:investment:create'), ctrl.createComplianceCheck);
router.put('/v2/compliance-checks/:id', requirePermission('module:investment:update'), ctrl.updateComplianceCheck);
router.put('/v2/investors/:investorId/compliance', requirePermission('module:investment:update'), ctrl.updateInvestorCompliance);
router.get('/v2/investors/:investorId/allocation-check', requirePermission('module:investment:view'), ctrl.checkInvestorAllocation);

// Phase 24 — reports / intelligence / copilot
router.get('/v2/report-catalog', requirePermission('module:investment:view'), ctrl.listReportCatalog);
router.post('/v2/reports/run', requirePermission('module:investment:view'), ctrl.runInvestmentReport);
router.get('/v2/saved-reports', requirePermission('module:investment:view'), ctrl.listSavedReports);
router.post('/v2/saved-reports', requirePermission('module:investment:create'), ctrl.createSavedReport);
router.get('/v2/report-packs', requirePermission('module:investment:view'), ctrl.listReportPacks);
router.post('/v2/report-packs', requirePermission('module:investment:create'), ctrl.createReportPack);
router.post('/v2/report-packs/:id/run', requirePermission('module:investment:view'), ctrl.runReportPack);
router.get('/v2/report-schedules', requirePermission('module:investment:view'), ctrl.listReportSchedules);
router.post('/v2/report-schedules', requirePermission('module:investment:create'), ctrl.createReportSchedule);
router.post('/v2/report-schedules/run-due', requirePermission('module:investment:update'), ctrl.runDueSchedules);
router.get('/v2/export-history', requirePermission('module:investment:view'), ctrl.listExportHistory);
router.get('/v2/executive-dashboard', requirePermission('module:investment:view'), ctrl.getExecutiveDashboard);
router.get('/v2/work-queue', requirePermission('module:investment:view'), ctrl.getInvestmentWorkQueue);
router.get('/v2/copilot/tools', requirePermission('module:investment:view'), ctrl.listCopilotTools);
router.post('/v2/copilot/invoke', requirePermission('module:investment:view'), ctrl.invokeCopilotTool);

module.exports = router;
