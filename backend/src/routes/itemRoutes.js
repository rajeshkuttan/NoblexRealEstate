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
 * @route   GET /api/items/template
 * @desc    Download item import template
 * @access  Private
 */
router.get('/template', itemController.downloadTemplate);

/**
 * @route   POST /api/items/import
 * @desc    Import items from Excel
 * @access  Private
 */
router.post('/import', upload.single('file'), itemController.importItems);

/**
 * @route   GET /api/items/export
 * @desc    Export items to Excel
 * @access  Private
 */
router.get('/export', itemController.exportItems);

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
