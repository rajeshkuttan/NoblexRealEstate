const express = require('express');
const router = express.Router();
const leaseController = require('../controllers/leaseController');
const upload = require('../middleware/uploadMiddleware');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Lease routes
router.get('/analytics', leaseController.getAnalytics); // Analytics must be before /:id
router.post('/:id/approve', leaseController.approveLease);
router.post('/:id/terminate', leaseController.terminateLease);
router.get('/', leaseController.getAllLeases);
router.get('/stats', leaseController.getLeaseStats);
router.get('/expiring', leaseController.getExpiringLeases);
router.get('/:id', leaseController.getLeaseById);
router.post('/', upload.array('documents', 10), leaseController.createLease);
router.put('/:id', upload.array('documents', 10), leaseController.updateLease);
router.delete('/:id', leaseController.deleteLease);

module.exports = router;
