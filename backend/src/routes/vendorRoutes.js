/**
 * Vendor Routes
 * API routes for vendor management
 * Part of: Phase 3.1 - Vendor/AP APIs
 */

const express = require('express');
const router = express.Router();
const vendorController = require('../controllers/vendorController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/vendors
 * @desc    Get all vendors with filters and pagination
 * @access  Private
 * @query   page, limit, search, status, sortBy, sortOrder
 */
router.get('/', vendorController.getAllVendors);

/**
 * @route   GET /api/vendors/stats
 * @desc    Get vendor statistics and analytics
 * @access  Private
 */
router.get('/stats', vendorController.getVendorStats);

/**
 * @route   GET /api/vendors/:id
 * @desc    Get vendor by ID with detailed information
 * @access  Private
 */
router.get('/:id', vendorController.getVendorById);

/**
 * @route   POST /api/vendors
 * @desc    Create new vendor
 * @access  Private
 * @body    vendorName, contactPerson, email, phone, address, trn, paymentTerms, bankDetails, status, notes
 */
router.post('/', vendorController.createVendor);

/**
 * @route   PUT /api/vendors/:id
 * @desc    Update vendor
 * @access  Private
 * @body    vendorName, contactPerson, email, phone, address, trn, paymentTerms, bankDetails, status, notes
 */
router.put('/:id', vendorController.updateVendor);

/**
 * @route   DELETE /api/vendors/:id
 * @desc    Delete vendor (soft delete)
 * @access  Private
 */
router.delete('/:id', vendorController.deleteVendor);

module.exports = router;

