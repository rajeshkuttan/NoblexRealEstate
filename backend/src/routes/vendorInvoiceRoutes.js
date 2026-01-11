/**
 * Vendor Invoice Routes
 * API routes for vendor invoice and accounts payable management
 * Part of: Phase 3.1 - Vendor/AP APIs
 */

const express = require('express');
const router = express.Router();
const vendorInvoiceController = require('../controllers/vendorInvoiceController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/vendor-invoices
 * @desc    Get all vendor invoices with filters and pagination
 * @access  Private
 * @query   page, limit, search, vendorId, propertyId, status, paymentStatus, startDate, endDate, sortBy, sortOrder
 */
router.get('/', vendorInvoiceController.getAllVendorInvoices);

/**
 * @route   GET /api/vendor-invoices/stats
 * @desc    Get vendor invoice statistics
 * @access  Private
 */
router.get('/stats', vendorInvoiceController.getInvoiceStats);

/**
 * @route   GET /api/vendor-invoices/aging-report
 * @desc    Get accounts payable aging report
 * @access  Private
 * @query   vendorId, propertyId
 */
router.get('/aging-report', vendorInvoiceController.getAgingReport);

/**
 * @route   GET /api/vendor-invoices/payment-analysis
 * @desc    Get vendor payment analysis with optimization recommendations
 * @access  Private
 * @query   startDate, endDate, vendorId, minAmount
 */
router.get('/payment-analysis', vendorInvoiceController.getVendorPaymentAnalysis);

/**
 * @route   GET /api/vendor-invoices/:id
 * @desc    Get vendor invoice by ID
 * @access  Private
 */
router.get('/:id', vendorInvoiceController.getVendorInvoiceById);

/**
 * @route   POST /api/vendor-invoices
 * @desc    Create new vendor invoice
 * @access  Private
 * @body    invoiceNumber, vendorId, propertyId, invoiceDate, dueDate, subtotal, taxAmount, totalAmount, description, attachments
 */
router.post('/', vendorInvoiceController.createVendorInvoice);

/**
 * @route   PUT /api/vendor-invoices/:id
 * @desc    Update vendor invoice
 * @access  Private
 * @body    invoiceNumber, vendorId, propertyId, invoiceDate, dueDate, subtotal, taxAmount, totalAmount, description, attachments
 */
router.put('/:id', vendorInvoiceController.updateVendorInvoice);

/**
 * @route   POST /api/vendor-invoices/:id/submit
 * @desc    Submit invoice for approval
 * @access  Private
 */
router.post('/:id/submit', vendorInvoiceController.submitForApproval);

/**
 * @route   POST /api/vendor-invoices/:id/approve
 * @desc    Approve or reject vendor invoice
 * @access  Private
 * @body    action ('approve' or 'reject'), notes
 */
router.post('/:id/approve', vendorInvoiceController.approveVendorInvoice);

/**
 * @route   DELETE /api/vendor-invoices/:id
 * @desc    Delete vendor invoice (soft delete)
 * @access  Private
 */
router.delete('/:id', vendorInvoiceController.deleteVendorInvoice);

module.exports = router;

