/**
 * Item Routes
 * API routes for Item Master management
 */

const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authMiddleware } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

/**
 * @route   GET /api/items
 * @desc    Get all items with filters and pagination
 * @access  Private
 * @query   page, limit, search, category, accountId
 */
router.get('/', itemController.getAllItems);

/**
 * @route   GET /api/items/:id
 * @desc    Get item by ID
 * @access  Private
 */
router.get('/:id', itemController.getItemById);

/**
 * @route   POST /api/items
 * @desc    Create new item
 * @access  Private
 * @body    itemName, itemCategory, unitOfMeasure, accountId, description
 */
router.post('/', itemController.createItem);

/**
 * @route   PUT /api/items/:id
 * @desc    Update item
 * @access  Private
 * @body    itemName, itemCategory, unitOfMeasure, accountId, description, isActive
 */
router.put('/:id', itemController.updateItem);

/**
 * @route   DELETE /api/items/:id
 * @desc    Delete item (soft delete)
 * @access  Private
 */
router.delete('/:id', itemController.deleteItem);

module.exports = router;
