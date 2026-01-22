/**
 * Purchase Order Routes
 * API routes for Purchase Order management
 */

const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/purchase-orders
 * @desc    Get all purchase orders with filters and pagination
 * @access  Private
 * @query   page, limit, search, vendorId, status, startDate, endDate
 */
router.get('/', purchaseOrderController.getAllPurchaseOrders);

/**
 * @route   GET /api/purchase-orders/:id
 * @desc    Get purchase order by ID
 * @access  Private
 */
router.get('/:id', purchaseOrderController.getPurchaseOrderById);

/**
 * @route   GET /api/purchase-orders/:id/status
 * @desc    Get PO status and received quantities
 * @access  Private
 */
router.get('/:id/status', purchaseOrderController.getPOStatus);

/**
 * @route   POST /api/purchase-orders
 * @desc    Create new purchase order
 * @access  Private
 * @body    vendorId, poDate, expectedDeliveryDate, lineItems, notes
 */
router.post('/', purchaseOrderController.createPurchaseOrder);

/**
 * @route   PUT /api/purchase-orders/:id
 * @desc    Update purchase order (only if draft)
 * @access  Private
 * @body    vendorId, poDate, expectedDeliveryDate, lineItems, notes, status
 */
router.put('/:id', purchaseOrderController.updatePurchaseOrder);

/**
 * @route   PATCH /api/purchase-orders/:id/cancel
 * @desc    Cancel purchase order
 * @access  Private
 */
router.patch('/:id/cancel', purchaseOrderController.cancelPurchaseOrder);

module.exports = router;
