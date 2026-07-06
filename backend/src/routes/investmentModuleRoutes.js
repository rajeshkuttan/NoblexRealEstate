const express = require('express');
const { authMiddleware, requirePermission } = require('../middleware/authMiddleware');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const ctrl = require('../controllers/investmentModuleController');

const router = express.Router();

router.use(authMiddleware);
router.use(resolveCompanyContext);

router.get('/dashboard', requirePermission('module:investment:view'), ctrl.getDashboard);
router.get('/portfolio', requirePermission('module:investment:view'), ctrl.getPortfolio);

router.get('/categories', requirePermission('module:investment:view'), ctrl.listCategories);
router.post('/categories', requirePermission('module:investment:create'), ctrl.createCategory);
router.put('/categories/:id', requirePermission('module:investment:update'), ctrl.updateCategory);
router.delete('/categories/:id', requirePermission('module:investment:delete'), ctrl.deleteCategory);
router.get('/partners', requirePermission('module:investment:view'), ctrl.listPartners);

router.post('/assets', requirePermission('module:investment:create'), ctrl.createAsset);
router.get('/assets/:id', requirePermission('module:investment:view'), ctrl.getAsset);
router.put('/assets/:id', requirePermission('module:investment:update'), ctrl.updateAsset);
router.delete('/assets/:id', requirePermission('module:investment:delete'), ctrl.deleteAsset);

router.get('/assets/:id/transactions', requirePermission('module:investment:view'), ctrl.getAssetTransactions);
router.post('/transactions', requirePermission('module:investment:create'), ctrl.createTransaction);
router.get('/transactions', requirePermission('module:investment:view'), ctrl.listTransactions);
router.get('/transactions/:id/ledger', requirePermission('module:investment:view'), ctrl.getTransactionLedger);
router.post('/transactions/:id/approve', requirePermission('module:investment:approve'), ctrl.approveTransaction);
router.post('/transactions/:id/post', requirePermission('module:investment:post'), ctrl.postTransaction);
router.post('/transactions/:id/cancel', requirePermission('module:investment:update'), ctrl.cancelTransaction);
router.post('/transactions/:id/reject', requirePermission('module:investment:approve'), ctrl.rejectTransaction);

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

module.exports = router;
