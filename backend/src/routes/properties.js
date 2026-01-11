const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
  getPropertyMatches,
  addToFavorites,
  removeFromFavorites
} = require('../controllers/propertyController');
const { authenticateToken } = require('../middleware/auth');
const { validateProperty, validateId, validateQuery } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);

// Property CRUD operations
router.get('/', validateQuery, getProperties);
router.get('/:id', validateId, getProperty);
router.post('/', validateProperty, createProperty);
router.put('/:id', validateId, validateProperty, updateProperty);
router.delete('/:id', validateId, deleteProperty);

// Property matching operations
router.get('/matches/lead/:id', validateId, getPropertyMatches);
router.post('/:propertyId/favorites/lead/:leadId', addToFavorites);
router.delete('/:propertyId/favorites/lead/:leadId', removeFromFavorites);

module.exports = router;
