const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { InvestmentDocument } = require('../models');
const { logCompanyEvent } = require('../services/companyAuditService');
const portfolioService = require('../services/investment/investmentPortfolio.service');
const transactionService = require('../services/investment/investmentTransaction.service');
const valuationService = require('../services/investment/investmentValuation.service');
const allocationService = require('../services/investment/investmentPartnerAllocation.service');
const distributionService = require('../services/investment/investmentDistribution.service');
const reconciliationService = require('../services/investment/investmentReconciliation.service');
const valuationProviderService = require('../services/investment/investmentValuationProvider.service');
const dashboardService = require('../services/investment/investmentDashboard.service');
const reportService = require('../services/investment/investmentReport.service');
const postingService = require('../services/investment/investmentPosting.service');
const portfolioEntityService = require('../services/investment/portfolio/investmentPortfolioEntity.service');
const instrumentService = require('../services/investment/instruments/investmentInstrument.service');
const masterService = require('../services/investment/brokers/investmentMaster.service');
const phase17Migrate = require('../services/investment/portfolio/phase17Migrate.service');
const orderService = require('../services/investment/orders/investmentOrder.service');
const tradeService = require('../services/investment/orders/investmentTrade.service');
const settlementService = require('../services/investment/orders/investmentSettlement.service');
const incomeService = require('../services/investment/income/investmentIncome.service');
const corporateActionService = require('../services/investment/income/investmentCorporateAction.service');
const capitalService = require('../services/investment/capital/investmentCapital.service');
const valuationNavService = require('../services/investment/performance/investmentValuationNav.service');
const reconCloseService = require('../services/investment/reconciliation/investmentReconClose.service');
const riskComplianceService = require('../services/investment/risk/investmentRiskCompliance.service');
const intelligenceService = require('../services/investment/intelligence/investmentIntelligence.service');
const { companyWhere, withCompanyId } = require('../utils/companyScope');

const INVESTMENT_AUDIT = {
  ASSET_CREATED: 'INVESTMENT_ASSET_CREATED',
  ASSET_UPDATED: 'INVESTMENT_ASSET_UPDATED',
  TRANSACTION_CREATED: 'INVESTMENT_TRANSACTION_CREATED',
  TRANSACTION_APPROVED: 'INVESTMENT_TRANSACTION_APPROVED',
  TRANSACTION_POSTED: 'INVESTMENT_TRANSACTION_POSTED',
  TRANSACTION_CANCELLED: 'INVESTMENT_TRANSACTION_CANCELLED',
  TRANSACTION_REJECTED: 'INVESTMENT_TRANSACTION_REJECTED',
  VALUATION_CREATED: 'INVESTMENT_VALUATION_CREATED',
  VALUATION_APPROVED: 'INVESTMENT_VALUATION_APPROVED',
  ALLOCATION_CHANGED: 'INVESTMENT_ALLOCATION_CHANGED',
  DOCUMENT_UPLOADED: 'INVESTMENT_DOCUMENT_UPLOADED',
  DOCUMENT_DELETED: 'INVESTMENT_DOCUMENT_DELETED',
  DISTRIBUTION_PREPARED: 'INVESTMENT_DISTRIBUTION_PREPARED',
  DISTRIBUTION_APPROVED: 'INVESTMENT_DISTRIBUTION_APPROVED',
  DISTRIBUTION_POSTED: 'INVESTMENT_DISTRIBUTION_POSTED',
  DISTRIBUTION_CANCELLED: 'INVESTMENT_DISTRIBUTION_CANCELLED',
  VALUATIONS_IMPORTED: 'INVESTMENT_VALUATIONS_IMPORTED',
};

async function audit(req, action, entityId, metadata = {}) {
  await logCompanyEvent({
    req,
    action,
    entityId: entityId || req.companyId,
    metadata: { module: 'investment', ...metadata },
  });
}

const uploadDir = path.join(__dirname, '../../../uploads/investments');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 15 * 1024 * 1024 } });

function wrap(fn) {
  return async (req, res, next) => {
    try {
      const data = await fn(req, res);
      if (!res.headersSent) {
        res.json({ success: true, data });
      }
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({
        success: false,
        message: err.message || 'Request failed',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
      if (next && status >= 500) next(err);
    }
  };
}

module.exports = {
  upload,
  INVESTMENT_AUDIT,

  getDashboard: wrap(async (req) => dashboardService.getDashboard(req)),

  getPortfolio: wrap(async (req) => portfolioService.listPortfolio(req, req.query)),

  listCategories: wrap(async (req) => portfolioService.listCategories(req)),

  createCategory: wrap(async (req) => portfolioService.createCategory(req, req.body)),

  listPartners: wrap(async (req) => allocationService.listInvestors(req)),

  updateCategory: wrap(async (req) => portfolioService.updateCategory(req, req.params.id, req.body)),

  deleteCategory: wrap(async (req) => portfolioService.deleteCategory(req, req.params.id)),

  createAsset: wrap(async (req) => {
    const asset = await portfolioService.createAsset(req, req.body);
    await audit(req, INVESTMENT_AUDIT.ASSET_CREATED, asset.id, { investmentCode: asset.investmentCode });
    return asset;
  }),

  getAsset: wrap(async (req) => portfolioService.getAssetDetail(req, req.params.id)),

  updateAsset: wrap(async (req) => {
    const asset = await portfolioService.updateAsset(req, req.params.id, req.body);
    await audit(req, INVESTMENT_AUDIT.ASSET_UPDATED, asset.id);
    return asset;
  }),

  deleteAsset: wrap(async (req) => portfolioService.deleteAsset(req, req.params.id)),

  archiveAsset: wrap(async (req) => portfolioService.archiveAsset(req, req.params.id)),
  restoreAsset: wrap(async (req) => portfolioService.restoreAsset(req, req.params.id)),
  cloneAsset: wrap(async (req) => {
    const asset = await portfolioService.cloneAsset(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.ASSET_CREATED, asset.id, { clonedFrom: req.params.id });
    return asset;
  }),
  restoreCategory: wrap(async (req) => portfolioService.restoreCategory(req, req.params.id)),

  getAssetTransactions: wrap(async (req) =>
    transactionService.listAssetTransactions(req, req.params.id, req.query)),

  listTransactions: wrap(async (req) => transactionService.listTransactions(req, req.query)),

  getTransactionLedger: wrap(async (req) => transactionService.getTransactionLedger(req, req.params.id)),

  duplicateTransaction: wrap(async (req) => {
    const txn = await transactionService.duplicateTransaction(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.TRANSACTION_CREATED, txn.id, { duplicatedFrom: req.params.id });
    return txn;
  }),

  bulkApproveTransactions: wrap(async (req) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    return transactionService.bulkApproveTransactions(req, ids);
  }),
  bulkRejectTransactions: wrap(async (req) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    return transactionService.bulkRejectTransactions(req, ids, req.body.reason);
  }),
  bulkPostTransactions: wrap(async (req) => {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    return transactionService.bulkPostTransactions(req, ids);
  }),

  createTransaction: wrap(async (req) => {
    const txn = await transactionService.createTransaction(req, req.body);
    await audit(req, INVESTMENT_AUDIT.TRANSACTION_CREATED, txn.id, { transactionNo: txn.transactionNo });
    return txn;
  }),

  approveTransaction: wrap(async (req) => {
    const txn = await transactionService.approveTransaction(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.TRANSACTION_APPROVED, txn.id);
    return txn;
  }),

  postTransaction: wrap(async (req) => {
    const txn = await postingService.postTransaction(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.TRANSACTION_POSTED, txn.id);
    return txn;
  }),

  cancelTransaction: wrap(async (req) => {
    const txn = await transactionService.cancelTransaction(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.TRANSACTION_CANCELLED, txn.id);
    return txn;
  }),

  rejectTransaction: wrap(async (req) => {
    const txn = await transactionService.rejectTransaction(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.TRANSACTION_REJECTED, txn.id);
    return txn;
  }),

  getAssetValuations: wrap(async (req) =>
    valuationService.listValuations(req, req.params.id)),

  createValuation: wrap(async (req) => {
    const val = await valuationService.createValuation(req, req.body);
    await audit(req, INVESTMENT_AUDIT.VALUATION_CREATED, val.id);
    return val;
  }),

  approveValuation: wrap(async (req) => {
    const result = await valuationService.approveValuation(req, req.params.id, req.user?.id);
    const valuation = result.valuation || result;
    await audit(req, INVESTMENT_AUDIT.VALUATION_APPROVED, valuation.id);
    return result;
  }),

  importValuations: wrap(async (req) => {
    const result = await valuationService.importValuations(req, req.body);
    await audit(req, INVESTMENT_AUDIT.VALUATIONS_IMPORTED, req.companyId, {
      created: result.created.length,
      errors: result.errors.length,
    });
    return result;
  }),

  listDistributions: wrap(async (req) => distributionService.listDistributions(req, req.query)),

  getDistribution: wrap(async (req) => distributionService.getDistribution(req, req.params.id)),

  prepareDistribution: wrap(async (req) => {
    const dist = await distributionService.prepareFromTransaction(req, req.body.investmentTransactionId);
    await audit(req, INVESTMENT_AUDIT.DISTRIBUTION_PREPARED, dist.id, { distributionNo: dist.distributionNo });
    return dist;
  }),

  approveDistribution: wrap(async (req) => {
    const dist = await distributionService.approveDistribution(req, req.params.id, req.user?.id);
    await audit(req, INVESTMENT_AUDIT.DISTRIBUTION_APPROVED, dist.id);
    return dist;
  }),

  postDistribution: wrap(async (req) => {
    const dist = await distributionService.postDistribution(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.DISTRIBUTION_POSTED, dist.id);
    return dist;
  }),

  cancelDistribution: wrap(async (req) => {
    const dist = await distributionService.cancelDistribution(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.DISTRIBUTION_CANCELLED, dist.id);
    return dist;
  }),

  getAssetAllocations: wrap(async (req) =>
    allocationService.listAllocations(req, req.params.id)),

  createAllocation: wrap(async (req) => {
    const alloc = await allocationService.createAllocation(req, req.params.id, req.body);
    await audit(req, INVESTMENT_AUDIT.ALLOCATION_CHANGED, alloc.id, { action: 'create' });
    return alloc;
  }),

  updateAllocation: wrap(async (req) => {
    const alloc = await allocationService.updateAllocation(req, req.params.id, req.body);
    await audit(req, INVESTMENT_AUDIT.ALLOCATION_CHANGED, alloc.id, { action: 'update' });
    return alloc;
  }),

  deleteAllocation: wrap(async (req) => {
    const result = await allocationService.deleteAllocation(req, req.params.id);
    await audit(req, INVESTMENT_AUDIT.ALLOCATION_CHANGED, req.params.id, { action: 'delete' });
    return result;
  }),

  getReportPortfolio: wrap(async (req) => reportService.portfolioReport(req, req.query)),
  getReportLedger: wrap(async (req) => reportService.ledgerReport(req, req.query)),
  getReportDividends: wrap(async (req) => reportService.dividendReport(req, req.query)),
  getReportGainLoss: wrap(async (req) => reportService.gainLossReport(req, req.query)),
  getReportValuations: wrap(async (req) => reportService.valuationHistoryReport(req, req.query)),
  getMonthEndReconciliation: wrap(async (req) => reconciliationService.getMonthEndReconciliation(req, req.query)),
  getPartnerStatement: wrap(async (req) =>
    reportService.partnerStatement(req, req.params.partnerId, req.query)),

  getAccountSettings: wrap(async (req) => postingService.getAccountSettings(req)),
  updateAccountSettings: wrap(async (req) => postingService.updateAccountSettings(req, req.body)),

  getValuationProviderSettings: wrap(async (req) => valuationProviderService.getProviderSettings(req)),
  updateValuationProviderSettings: wrap(async (req) => valuationProviderService.updateProviderSettings(req, req.body)),

  uploadDocument: [
    upload.single('file'),
    wrap(async (req) => {
      if (!req.file) {
        const err = new Error('File is required');
        err.statusCode = 400;
        throw err;
      }
      await portfolioService.getAssetDetail(req, req.params.id);
      const doc = await InvestmentDocument.create(
        withCompanyId(req, {
          investmentAssetId: req.params.id,
          documentType: req.body.documentType || 'OTHER',
          fileName: req.file.originalname,
          filePath: `/uploads/investments/${req.file.filename}`,
          uploadedBy: req.user?.id,
          expiryDate: req.body.expiryDate || null,
          remarks: req.body.remarks || null,
        })
      );
      await audit(req, INVESTMENT_AUDIT.DOCUMENT_UPLOADED, doc.id);
      return doc;
    }),
  ],

  getAssetDocuments: wrap(async (req) => {
    await portfolioService.getAssetDetail(req, req.params.id);
    return InvestmentDocument.findAll({
      where: { investmentAssetId: req.params.id, ...companyWhere(req) },
      order: [['createdAt', 'DESC']],
    });
  }),

  deleteDocument: wrap(async (req) => {
    const doc = await InvestmentDocument.findOne({
      where: { id: req.params.id, ...companyWhere(req) },
    });
    if (!doc) {
      const err = new Error('Document not found');
      err.statusCode = 404;
      throw err;
    }
    await doc.destroy();
    await audit(req, INVESTMENT_AUDIT.DOCUMENT_DELETED, req.params.id);
    return { deleted: true };
  }),

  // Phase 17 — portfolios / instruments / masters
  listPortfoliosV2: wrap(async (req) => portfolioEntityService.listPortfolios(req)),
  getPortfolio360: wrap(async (req) => portfolioEntityService.getPortfolio360(req, req.params.id)),
  createPortfolioV2: wrap(async (req) => portfolioEntityService.createPortfolio(req, req.body)),
  updatePortfolioV2: wrap(async (req) =>
    portfolioEntityService.updatePortfolio(req, req.params.id, req.body)),

  listInstruments: wrap(async (req) => instrumentService.listInstruments(req)),
  getInstrument360: wrap(async (req) => instrumentService.getInstrument360(req, req.params.id)),
  createInstrument: wrap(async (req) => instrumentService.createInstrument(req, req.body)),
  updateInstrument: wrap(async (req) =>
    instrumentService.updateInstrument(req, req.params.id, req.body)),
  getInstrumentTypeRules: wrap(async () => instrumentService.ASSET_TYPE_RULES),

  listBrokers: wrap(async (req) => masterService.listBrokers(req)),
  createBroker: wrap(async (req) => masterService.createBroker(req, req.body)),
  updateBroker: wrap(async (req) => masterService.updateBroker(req, req.params.id, req.body)),
  listCustodians: wrap(async (req) => masterService.listCustodians(req)),
  createCustodian: wrap(async (req) => masterService.createCustodian(req, req.body)),
  updateCustodian: wrap(async (req) => masterService.updateCustodian(req, req.params.id, req.body)),
  listInvestmentAccounts: wrap(async (req) => masterService.listAccounts(req)),
  createInvestmentAccount: wrap(async (req) => masterService.createAccount(req, req.body)),

  runPhase17Migration: wrap(async (req) => {
    if (req.query.allCompanies === 'true') {
      return phase17Migrate.migrateAllCompanies();
    }
    return phase17Migrate.migrateCompanyAssets(req.companyId);
  }),

  // Phase 18 — orders / trades / settlements
  listOrders: wrap(async (req) => orderService.listOrders(req)),
  getOrder: wrap(async (req) => orderService.getOrder(req, req.params.id)),
  createOrder: wrap(async (req) => orderService.createOrder(req, req.body)),
  updateOrder: wrap(async (req) => orderService.updateOrder(req, req.params.id, req.body)),
  submitOrder: wrap(async (req) => orderService.submitOrder(req, req.params.id)),
  approveOrder: wrap(async (req) => orderService.approveOrder(req, req.params.id)),
  rejectOrder: wrap(async (req) => orderService.rejectOrder(req, req.params.id, req.body?.reason)),
  placeOrder: wrap(async (req) => orderService.placeOrder(req, req.params.id)),
  cancelOrder: wrap(async (req) => orderService.cancelOrder(req, req.params.id, req.body?.reason)),

  listTrades: wrap(async (req) => tradeService.listTrades(req)),
  getTrade: wrap(async (req) => tradeService.getTrade(req, req.params.id)),
  createTrade: wrap(async (req) => tradeService.createTrade(req, req.body)),
  confirmTrade: wrap(async (req) => tradeService.confirmTrade(req, req.params.id)),
  cancelTrade: wrap(async (req) => tradeService.cancelTrade(req, req.params.id, req.body?.reason)),
  previewTrade: wrap(async (req) => tradeService.previewTrade(req, req.body)),

  listSettlements: wrap(async (req) => settlementService.listSettlements(req)),
  getSettlement: wrap(async (req) => settlementService.getSettlement(req, req.params.id)),
  settleSettlement: wrap(async (req) => settlementService.settleSettlement(req, req.params.id, req.body)),
  failSettlement: wrap(async (req) => settlementService.failSettlement(req, req.params.id, req.body)),
  cancelSettlement: wrap(async (req) => settlementService.cancelSettlement(req, req.params.id, req.body)),

  // Phase 19 — income / corporate actions
  listIncomeEvents: wrap(async (req) => incomeService.listIncomeEvents(req)),
  getIncomeEvent: wrap(async (req) => incomeService.getIncomeEvent(req, req.params.id)),
  createIncomeEvent: wrap(async (req) => incomeService.createIncomeEvent(req, req.body)),
  accrueIncome: wrap(async (req) => incomeService.accrueIncome(req, req.params.id, req.body)),
  markIncomeReceivable: wrap(async (req) => incomeService.markReceivable(req, req.params.id, req.body)),
  markIncomeReceived: wrap(async (req) => incomeService.markReceived(req, req.params.id, req.body)),
  reconcileIncome: wrap(async (req) => incomeService.reconcileIncomeEvent(req, req.params.id, req.body)),
  distributeIncome: wrap(async (req) => incomeService.distributeIncome(req, req.params.id, req.body)),
  reinvestIncome: wrap(async (req) => incomeService.reinvestIncome(req, req.params.id, req.body)),
  cancelIncome: wrap(async (req) => incomeService.cancelIncome(req, req.params.id, req.body?.reason)),
  generateIncomeSchedule: wrap(async (req) => incomeService.generateExpectedSchedule(req, req.body)),
  runIncomeAccruals: wrap(async (req) => incomeService.runAccruals(req, req.body)),

  listCorporateActions: wrap(async (req) => corporateActionService.listCorporateActions(req)),
  getCorporateAction: wrap(async (req) => corporateActionService.getCorporateAction(req, req.params.id)),
  createCorporateAction: wrap(async (req) => corporateActionService.createCorporateAction(req, req.body)),
  generateEntitlements: wrap(async (req) =>
    corporateActionService.generateEntitlements(req, req.params.id)),
  applyCorporateAction: wrap(async (req) =>
    corporateActionService.applyCorporateAction(req, req.params.id)),
  settleCorporateAction: wrap(async (req) =>
    corporateActionService.settleCorporateAction(req, req.params.id)),
  cancelCorporateAction: wrap(async (req) =>
    corporateActionService.cancelCorporateAction(req, req.params.id, req.body?.reason)),

  // Phase 20 — investors / capital / waterfall distributions
  listInvestors: wrap(async (req) => capitalService.listInvestors(req)),
  getInvestor360: wrap(async (req) => capitalService.getInvestor360(req, req.params.id)),
  createInvestor: wrap(async (req) => capitalService.createInvestor(req, req.body)),
  updateInvestor: wrap(async (req) => capitalService.updateInvestor(req, req.params.id, req.body)),
  getPartnerStatementV2: wrap(async (req) =>
    capitalService.getPartnerStatement(req, req.params.id, req.query)),

  listCommitments: wrap(async (req) => capitalService.listCommitments(req)),
  createCommitment: wrap(async (req) => capitalService.createCommitment(req, req.body)),

  listCapitalCalls: wrap(async (req) => capitalService.listCapitalCalls(req)),
  getCapitalCall: wrap(async (req) => capitalService.getCapitalCall(req, req.params.id)),
  createCapitalCall: wrap(async (req) => capitalService.createCapitalCall(req, req.body)),
  issueCapitalCall: wrap(async (req) => capitalService.issueCapitalCall(req, req.params.id)),
  receiveCapitalCallLine: wrap(async (req) =>
    capitalService.receiveCapitalCallLine(req, req.params.lineId, req.body)),

  listOwnership: wrap(async (req) => capitalService.listOwnership(req)),
  setOwnership: wrap(async (req) => capitalService.setOwnership(req, req.body)),

  listCapitalAccounts: wrap(async (req) => capitalService.listCapitalAccounts(req)),
  upsertCapitalAccount: wrap(async (req) => capitalService.upsertCapitalAccount(req, req.body)),

  listDistributionRuns: wrap(async (req) => capitalService.listDistributionRuns(req)),
  getDistributionRun: wrap(async (req) => capitalService.getDistributionRun(req, req.params.id)),
  createDistributionRun: wrap(async (req) => capitalService.createDistributionRun(req, req.body)),
  calculateDistributionRun: wrap(async (req) =>
    capitalService.calculateDistributionRun(req, req.params.id, req.body)),
  submitDistributionRun: wrap(async (req) =>
    capitalService.transitionDistributionRun(req, req.params.id, 'UNDER_REVIEW')),
  approveDistributionRun: wrap(async (req) =>
    capitalService.transitionDistributionRun(req, req.params.id, 'APPROVED')),
  payDistributionRun: wrap(async (req) =>
    capitalService.transitionDistributionRun(req, req.params.id, 'PAID')),
  reconcileDistributionRun: wrap(async (req) =>
    capitalService.transitionDistributionRun(req, req.params.id, 'RECONCILED')),
  issueDistributionStatement: wrap(async (req) =>
    capitalService.transitionDistributionRun(req, req.params.id, 'STATEMENT_ISSUED')),

  // Phase 21 — valuation / NAV / performance
  listMarketPrices: wrap(async (req) => valuationNavService.listMarketPrices(req)),
  upsertMarketPrice: wrap(async (req) => valuationNavService.upsertMarketPrice(req, req.body)),
  importMarketPrices: wrap(async (req) => valuationNavService.importMarketPrices(req, req.body)),

  listValuationBatches: wrap(async (req) => valuationNavService.listValuationBatches(req)),
  getValuationBatch: wrap(async (req) => valuationNavService.getValuationBatch(req, req.params.id)),
  createValuationBatch: wrap(async (req) => valuationNavService.createValuationBatch(req, req.body)),
  validateValuationBatch: wrap(async (req) => valuationNavService.validateValuationBatch(req, req.params.id)),
  approveValuationBatch: wrap(async (req) => valuationNavService.approveValuationBatch(req, req.params.id)),
  postValuationBatch: wrap(async (req) => valuationNavService.postValuationBatch(req, req.params.id)),
  fixValuationLine: wrap(async (req) =>
    valuationNavService.fixValuationLine(req, req.params.lineId, req.body)),

  computeNav: wrap(async (req) => valuationNavService.computeAndSaveNav(req, req.body)),
  listNavSnapshots: wrap(async (req) => valuationNavService.listNavSnapshots(req)),

  calculatePerformance: wrap(async (req) => valuationNavService.calculatePerformance(req, req.body)),
  listPerformancePeriods: wrap(async (req) => valuationNavService.listPerformancePeriods(req)),
  listBenchmarks: wrap(async (req) => valuationNavService.listBenchmarks(req)),
  createBenchmark: wrap(async (req) => valuationNavService.createBenchmark(req, req.body)),

  // Phase 22 — reconciliation / period close
  listReconBatches: wrap(async (req) => reconCloseService.listReconBatches(req)),
  getReconBatch: wrap(async (req) => reconCloseService.getReconBatch(req, req.params.id)),
  createReconBatch: wrap(async (req) => reconCloseService.createReconBatch(req, req.body)),
  importReconRows: wrap(async (req) => reconCloseService.importReconRows(req, req.params.id, req.body)),
  runReconMatch: wrap(async (req) => reconCloseService.runMatch(req, req.params.id, req.body)),
  resolveReconLine: wrap(async (req) => reconCloseService.resolveReconLine(req, req.params.lineId, req.body)),
  approveReconBatch: wrap(async (req) => reconCloseService.approveReconBatch(req, req.params.id)),
  previewReconMatch: wrap(async (req) => reconCloseService.previewMatch(req, req.body)),
  previewManyToOne: wrap(async (req) => reconCloseService.previewManyToOne(req, req.body)),
  previewOneToMany: wrap(async (req) => reconCloseService.previewOneToMany(req, req.body)),

  listClosePeriods: wrap(async (req) => reconCloseService.listClosePeriods(req)),
  getOrCreateClosePeriod: wrap(async (req) => reconCloseService.getOrCreateClosePeriod(req, req.body)),
  updateCloseChecklist: wrap(async (req) =>
    reconCloseService.updateCloseChecklist(req, req.params.id, req.body)),
  closeInvestmentPeriod: wrap(async (req) => reconCloseService.closePeriod(req, req.params.id)),
  reopenInvestmentPeriod: wrap(async (req) =>
    reconCloseService.reopenPeriod(req, req.params.id, req.body)),
  checkPeriodLock: wrap(async (req) => reconCloseService.checkPeriodLock(req, req.query)),

  // Phase 23 — risk / compliance
  listMandates: wrap(async (req) => riskComplianceService.listMandates(req)),
  getMandate: wrap(async (req) => riskComplianceService.getMandate(req, req.params.id)),
  createMandate: wrap(async (req) => riskComplianceService.createMandate(req, req.body)),
  updateMandate: wrap(async (req) => riskComplianceService.updateMandate(req, req.params.id, req.body)),
  activateMandate: wrap(async (req) => riskComplianceService.activateMandate(req, req.params.id)),
  listRiskLimits: wrap(async (req) => riskComplianceService.listRiskLimits(req)),
  createRiskLimit: wrap(async (req) => riskComplianceService.createRiskLimit(req, req.body)),
  listBreaches: wrap(async (req) => riskComplianceService.listBreaches(req)),
  createBreach: wrap(async (req) => riskComplianceService.createBreach(req, req.body)),
  overrideBreach: wrap(async (req) => riskComplianceService.overrideBreach(req, req.params.id, req.body)),
  runLimitScan: wrap(async (req) => riskComplianceService.runLimitScan(req, req.body)),
  getRiskDashboard: wrap(async (req) => riskComplianceService.getRiskDashboard(req)),
  listComplianceChecks: wrap(async (req) => riskComplianceService.listComplianceChecks(req)),
  createComplianceCheck: wrap(async (req) => riskComplianceService.createComplianceCheck(req, req.body)),
  updateComplianceCheck: wrap(async (req) =>
    riskComplianceService.updateComplianceCheck(req, req.params.id, req.body)),
  updateInvestorCompliance: wrap(async (req) =>
    riskComplianceService.updateInvestorCompliance(req, req.params.investorId, req.body)),
  checkInvestorAllocation: wrap(async (req) =>
    riskComplianceService.checkInvestorForAllocation(req, req.params.investorId)),
  previewPreTrade: wrap(async (req) => riskComplianceService.previewPreTrade(req, req.body)),

  // Phase 24 — intelligence / reports / copilot
  listReportCatalog: wrap(async (req) => intelligenceService.listReportCatalog(req)),
  runInvestmentReport: wrap(async (req) => intelligenceService.runReport(req, req.body)),
  listSavedReports: wrap(async (req) => intelligenceService.listSavedReports(req)),
  createSavedReport: wrap(async (req) => intelligenceService.createSavedReport(req, req.body)),
  listReportPacks: wrap(async (req) => intelligenceService.listPacks(req)),
  createReportPack: wrap(async (req) => intelligenceService.createPack(req, req.body)),
  runReportPack: wrap(async (req) => intelligenceService.runPack(req, req.params.id, req.body)),
  listReportSchedules: wrap(async (req) => intelligenceService.listSchedules(req)),
  createReportSchedule: wrap(async (req) => intelligenceService.createSchedule(req, req.body)),
  runDueSchedules: wrap(async (req) => intelligenceService.runDueSchedules(req, req.body)),
  listExportHistory: wrap(async (req) => intelligenceService.listExportHistory(req)),
  getExecutiveDashboard: wrap(async (req) => intelligenceService.getExecutiveDashboard(req)),
  getInvestmentWorkQueue: wrap(async (req) => intelligenceService.getWorkQueue(req)),
  listCopilotTools: wrap(async (req) => intelligenceService.listCopilotTools(req)),
  invokeCopilotTool: wrap(async (req) => intelligenceService.invokeCopilotTool(req, req.body)),

  getInvestmentV2ReleaseStatus: wrap(async () => {
    const { publicReleaseStatus } = require('../config/investmentV2ReleaseConfig');
    return publicReleaseStatus();
  }),

  listOmsPilotUsers: wrap(async (req) => {
    const { InvestmentOmsPilotUser } = require('../models');
    const rows = await InvestmentOmsPilotUser.findAll({
      where: { companyId: req.companyId },
      order: [['id', 'ASC']],
    });
    return { pilots: rows };
  }),

  upsertOmsPilotUser: wrap(async (req) => {
    const { InvestmentOmsPilotUser } = require('../models');
    const userId = Number(req.body.userId);
    if (!userId) {
      const err = new Error('userId required');
      err.statusCode = 400;
      throw err;
    }
    const [row] = await InvestmentOmsPilotUser.findOrCreate({
      where: { companyId: req.companyId, userId },
      defaults: {
        companyId: req.companyId,
        userId,
        isActive: req.body.isActive !== false,
        notes: req.body.notes || null,
      },
    });
    await row.update({
      isActive: req.body.isActive !== false,
      notes: req.body.notes != null ? req.body.notes : row.notes,
    });
    return row;
  }),

  removeOmsPilotUser: wrap(async (req) => {
    const { InvestmentOmsPilotUser } = require('../models');
    const row = await InvestmentOmsPilotUser.findOne({
      where: { id: req.params.id, companyId: req.companyId },
    });
    if (!row) {
      const err = new Error('Pilot user not found');
      err.statusCode = 404;
      throw err;
    }
    await row.update({ isActive: false });
    return { ok: true };
  }),
};
