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

  getAssetTransactions: wrap(async (req) =>
    transactionService.listAssetTransactions(req, req.params.id, req.query)),

  listTransactions: wrap(async (req) => transactionService.listTransactions(req, req.query)),

  getTransactionLedger: wrap(async (req) => transactionService.getTransactionLedger(req, req.params.id)),

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
};
