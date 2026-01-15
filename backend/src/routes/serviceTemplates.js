const express = require('express');
const router = express.Router();
const serviceTemplatesController = require('../controllers/serviceTemplatesController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// Get all service templates
router.get('/', serviceTemplatesController.getAll);

// Get categories
router.get('/categories', serviceTemplatesController.getCategories);

// Get templates by category
router.get('/category/:category', serviceTemplatesController.getByCategory);

// Get a single service template by ID
router.get('/:id', serviceTemplatesController.getById);

// Create a new service template
router.post('/', serviceTemplatesController.create);

// Update a service template
router.put('/:id', serviceTemplatesController.update);

// Delete a service template (soft delete by default, hard delete with ?hard=true)
router.delete('/:id', serviceTemplatesController.delete);

module.exports = router;
