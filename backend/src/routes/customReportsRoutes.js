/**
 * Custom Reports Routes
 * API routes for custom report builder
 * Part of: Phase 5.3 - Custom Report Builder
 */

const express = require('express');
const router = express.Router();
const customReportsController = require('../controllers/customReportsController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/custom-reports/datasources
 * @desc    Get available data sources and fields
 * @access  Private
 */
router.get('/datasources', customReportsController.getDataSources);

/**
 * @route   GET /api/custom-reports
 * @desc    Get all custom reports
 * @access  Private
 * @query   page, limit, userId
 */
router.get('/', customReportsController.getAllCustomReports);

/**
 * @route   GET /api/custom-reports/:id
 * @desc    Get custom report by ID
 * @access  Private
 */
router.get('/:id', customReportsController.getCustomReportById);

/**
 * @route   POST /api/custom-reports
 * @desc    Create new custom report
 * @access  Private
 * @body    reportName, description, dataSource, selectedFields, filters, groupBy, sortBy, chartType, chartConfig, schedule
 */
router.post('/', customReportsController.createCustomReport);

/**
 * @route   PUT /api/custom-reports/:id
 * @desc    Update custom report
 * @access  Private
 * @body    reportName, description, dataSource, selectedFields, filters, groupBy, sortBy, chartType, chartConfig, schedule
 */
router.put('/:id', customReportsController.updateCustomReport);

/**
 * @route   DELETE /api/custom-reports/:id
 * @desc    Delete custom report (soft delete)
 * @access  Private
 */
router.delete('/:id', customReportsController.deleteCustomReport);

/**
 * @route   POST /api/custom-reports/:id/execute
 * @desc    Execute custom report with optional parameters
 * @access  Private
 * @body    parameters (object)
 */
router.post('/:id/execute', customReportsController.executeCustomReport);

module.exports = router;
