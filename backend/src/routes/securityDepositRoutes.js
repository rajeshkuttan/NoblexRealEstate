/**
 * Security Deposit Routes
 */

const express = require('express');
const router = express.Router();
const securityDepositController = require('../controllers/securityDepositController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


// Get all security deposits
router.get('/', securityDepositController.getAllSecurityDeposits);

// Get security deposit statistics
router.get('/stats', securityDepositController.getSecurityDepositStats);

// Get deposits by property
router.get('/by-property', securityDepositController.getDepositsByProperty);

// Get security deposit by ID
router.get('/:id', securityDepositController.getSecurityDepositById);

// Create security deposit
router.post('/', securityDepositController.createSecurityDeposit);

// Update security deposit
router.put('/:id', securityDepositController.updateSecurityDeposit);

// Schedule inspection
router.post('/:id/schedule-inspection', securityDepositController.scheduleInspection);

// Complete inspection
router.post('/:id/complete-inspection', securityDepositController.completeInspection);

// Release deposit
router.post('/:id/release', securityDepositController.releaseDeposit);

// Forfeit deposit
router.post('/:id/forfeit', securityDepositController.forfeitDeposit);

// Partial release
router.post('/:id/partial-release', securityDepositController.partialRelease);

// Calculate accrued interest
router.get('/:id/calculate-interest', securityDepositController.calculateAccruedInterest);

// Delete security deposit (soft delete)
router.delete('/:id', securityDepositController.deleteSecurityDeposit);

module.exports = router;
