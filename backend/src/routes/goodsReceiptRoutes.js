/**
 * Goods Receipt Routes
 * API routes for Goods Receipt management
 */

const express = require('express');
const router = express.Router();
const goodsReceiptController = require('../controllers/goodsReceiptController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/goods-receipts
 * @desc    Get all goods receipts with filters and pagination
 * @access  Private
 * @query   page, limit, search, purchaseOrderId, status, startDate, endDate
 */
router.get('/', goodsReceiptController.getAllGoodsReceipts);

/**
 * @route   GET /api/goods-receipts/po/:poId
 * @desc    Get all goods receipts for a specific purchase order
 * @access  Private
 */
router.get('/po/:poId', goodsReceiptController.getGRByPO);

/**
 * @route   GET /api/goods-receipts/:id
 * @desc    Get goods receipt by ID
 * @access  Private
 */
router.get('/:id', goodsReceiptController.getGoodsReceiptById);

/**
 * @route   POST /api/goods-receipts
 * @desc    Create new goods receipt
 * @access  Private
 * @body    purchaseOrderId, receiptDate, receivedBy, lineItems, notes
 */
router.post('/', goodsReceiptController.createGoodsReceipt);

/**
 * @route   PUT /api/goods-receipts/:id
 * @desc    Update goods receipt (only if draft)
 * @access  Private
 * @body    receiptDate, receivedBy, lineItems, notes, status
 */
router.put('/:id', goodsReceiptController.updateGoodsReceipt);

module.exports = router;
