const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Unit routes
router.get('/', unitController.getAllUnits);
router.get('/stats', unitController.getUnitStats);
router.get('/:id', unitController.getUnitById);
router.post('/', unitController.createUnit);
router.put('/:id', unitController.updateUnit);
router.delete('/:id', unitController.deleteUnit);

module.exports = router;
