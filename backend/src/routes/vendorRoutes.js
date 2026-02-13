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

// Multer configuration for Excel import
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed!'), false);
    }
  }
});

/**
 * @route   GET /api/vendors/template
 * @desc    Download vendor import template
 * @access  Private
 */
router.get('/template', vendorController.downloadTemplate);

/**
 * @route   GET /api/vendors/export
 * @desc    Export vendors to Excel
 * @access  Private
 */
router.get('/export', vendorController.exportVendors);

/**
 * @route   POST /api/vendors/import
 * @desc    Import vendors from Excel
 * @access  Private
 */
router.post('/import', upload.single('file'), vendorController.importVendors);

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

