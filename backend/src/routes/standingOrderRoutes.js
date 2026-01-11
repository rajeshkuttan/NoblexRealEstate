/**
 * Standing Order Routes
 */

const express = require('express');
const router = express.Router();
const standingOrderController = require('../controllers/standingOrderController');
const { authenticateToken } = require('../middleware/auth');

// Get all standing orders
router.get('/', authenticateToken, standingOrderController.getAllStandingOrders);

// Get standing order statistics
router.get('/stats', authenticateToken, standingOrderController.getStandingOrderStats);

// Get standing order by ID
router.get('/:id', authenticateToken, standingOrderController.getStandingOrderById);

// Create standing order
router.post('/', authenticateToken, standingOrderController.createStandingOrder);

// Update standing order
router.put('/:id', authenticateToken, standingOrderController.updateStandingOrder);

// Approve mandate
router.post('/:id/approve', authenticateToken, standingOrderController.approveMandate);

// Pause standing order
router.post('/:id/pause', authenticateToken, standingOrderController.pauseStandingOrder);

// Resume standing order
router.post('/:id/resume', authenticateToken, standingOrderController.resumeStandingOrder);

// Cancel standing order
router.post('/:id/cancel', authenticateToken, standingOrderController.cancelStandingOrder);

// Process order manually
router.post('/:id/process', authenticateToken, standingOrderController.processOrderManually);

// Delete standing order (soft delete)
router.delete('/:id', authenticateToken, standingOrderController.deleteStandingOrder);

module.exports = router;
