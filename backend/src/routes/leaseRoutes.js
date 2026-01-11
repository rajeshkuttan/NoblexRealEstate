const express = require('express');
const router = express.Router();
const leaseController = require('../controllers/leaseController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Lease routes
router.get('/', leaseController.getAllLeases);
router.get('/stats', leaseController.getLeaseStats);
router.get('/expiring', leaseController.getExpiringLeases);
router.get('/:id', leaseController.getLeaseById);
router.post('/', leaseController.createLease);
router.put('/:id', leaseController.updateLease);
router.delete('/:id', leaseController.deleteLease);

module.exports = router;
