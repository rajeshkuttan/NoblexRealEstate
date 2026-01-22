/**
 * Purchase Invoice Routes
 * API routes for Purchase Invoice management
 */

const express = require('express');
const router = express.Router();
const purchaseInvoiceController = require('../controllers/purchaseInvoiceController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/purchase-invoices
 * @desc    Get all purchase invoices with filters and pagination
 * @access  Private
 * @query   page, limit, search, vendorId, status, paymentStatus, startDate, endDate
 */
router.get('/', purchaseInvoiceController.getAllPurchaseInvoices);

/**
 * @route   GET /api/purchase-invoices/:id
 * @desc    Get purchase invoice by ID
 * @access  Private
 */
router.get('/:id', purchaseInvoiceController.getPurchaseInvoiceById);

/**
 * @route   POST /api/purchase-invoices
 * @desc    Create new purchase invoice
 * @access  Private
 * @body    vendorId, purchaseOrderId, goodsReceiptId, invoiceDate, dueDate, lineItems, notes
 */
router.post('/', purchaseInvoiceController.createPurchaseInvoice);

/**
 * @route   PUT /api/purchase-invoices/:id
 * @desc    Update purchase invoice (only if draft)
 * @access  Private
 * @body    vendorId, purchaseOrderId, goodsReceiptId, invoiceDate, dueDate, lineItems, notes, status
 */
router.put('/:id', purchaseInvoiceController.updatePurchaseInvoice);

/**
 * @route   PATCH /api/purchase-invoices/:id/approve
 * @desc    Approve purchase invoice and create accounting entries
 * @access  Private
 */
router.patch('/:id/approve', purchaseInvoiceController.approvePurchaseInvoice);

/**
 * @route   PATCH /api/purchase-invoices/:id/cancel
 * @desc    Cancel purchase invoice and reverse accounting entries
 * @access  Private
 */
router.patch('/:id/cancel', purchaseInvoiceController.cancelPurchaseInvoice);

module.exports = router;
