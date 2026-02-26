/**
 * Financial Reports Routes
 * API routes for advanced financial reporting and analytics
 * Part of: Phase 5 - Reports & Analytics
 */

const express = require('express');
const router = express.Router();
const financialReportsController = require('../controllers/financialReportsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/finance/reports/property-profitability
 * @desc    Get property-wise profitability report with NOI and ROI
 * @access  Private
 * @query   startDate, endDate, propertyId, minRevenue, sortBy, sortOrder
 */
router.get('/property-profitability', financialReportsController.getPropertyProfitability);

/**
 * @route   GET /api/finance/reports/property-financials/:propertyId
 * @desc    Get detailed financial summary for a single property
 * @access  Private
 * @query   startDate, endDate
 */
router.get('/property-financials/:propertyId', financialReportsController.getPropertyFinancials);

/**
 * @route   GET /api/finance/reports/ar-aging-enhanced
 * @desc    Get enhanced AR aging report with risk scoring
 * @access  Private
 * @query   tenantId, propertyId
 */
router.get('/ar-aging-enhanced', financialReportsController.getEnhancedARAgingReport);

/**
 * @route   GET /api/finance/reports/budget-vs-actual
 * @desc    Get budget vs actual comparison with multi-level variance analysis
 * @access  Private
 * @query   budgetId, propertyId, startDate, endDate, varianceThreshold
 */
router.get('/budget-vs-actual', financialReportsController.getBudgetVsActualReport);

/**
 * @route   GET /api/finance/reports/property-financials
 * @desc    Get property-wise financial summary with revenue, expenses, and profitability
 * @access  Private
 * @query   propertyId, startDate, endDate
 */
router.get('/property-financials', financialReportsController.getPropertyFinancials);

/**
 * @route   GET /api/finance/reports/vat-export
 * @desc    Get FTA-compliant VAT export CSV
 * @access  Private
 * @query   startDate, endDate, period
 */
router.get('/vat-export', financialReportsController.getFTAVATExport);

router.get('/accounts-transactions', financialReportsController.getAccountsTransactions);

module.exports = router;
