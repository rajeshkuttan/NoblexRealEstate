/**
 * Standing Order Routes
 */

const express = require('express');
const router = express.Router();
const standingOrderController = require('../controllers/standingOrderController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


// Get all standing orders
router.get('/', standingOrderController.getAllStandingOrders);

// Get standing order statistics
router.get('/stats', standingOrderController.getStandingOrderStats);

// Get standing order by ID
router.get('/:id', standingOrderController.getStandingOrderById);

// Create standing order
router.post('/', standingOrderController.createStandingOrder);

// Update standing order
router.put('/:id', standingOrderController.updateStandingOrder);

// Approve mandate
router.post('/:id/approve', standingOrderController.approveMandate);

// Pause standing order
router.post('/:id/pause', standingOrderController.pauseStandingOrder);

// Resume standing order
router.post('/:id/resume', standingOrderController.resumeStandingOrder);

// Cancel standing order
router.post('/:id/cancel', standingOrderController.cancelStandingOrder);

// Process order manually
router.post('/:id/process', standingOrderController.processOrderManually);

// Delete standing order (soft delete)
router.delete('/:id', standingOrderController.deleteStandingOrder);

module.exports = router;
