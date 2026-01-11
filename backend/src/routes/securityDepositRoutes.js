/**
 * Security Deposit Routes
 */

const express = require('express');
const router = express.Router();
const securityDepositController = require('../controllers/securityDepositController');
const { authenticateToken } = require('../middleware/auth');

// Get all security deposits
router.get('/', authenticateToken, securityDepositController.getAllSecurityDeposits);

// Get security deposit statistics
router.get('/stats', authenticateToken, securityDepositController.getSecurityDepositStats);

// Get deposits by property
router.get('/by-property', authenticateToken, securityDepositController.getDepositsByProperty);

// Get security deposit by ID
router.get('/:id', authenticateToken, securityDepositController.getSecurityDepositById);

// Create security deposit
router.post('/', authenticateToken, securityDepositController.createSecurityDeposit);

// Update security deposit
router.put('/:id', authenticateToken, securityDepositController.updateSecurityDeposit);

// Schedule inspection
router.post('/:id/schedule-inspection', authenticateToken, securityDepositController.scheduleInspection);

// Complete inspection
router.post('/:id/complete-inspection', authenticateToken, securityDepositController.completeInspection);

// Release deposit
router.post('/:id/release', authenticateToken, securityDepositController.releaseDeposit);

// Forfeit deposit
router.post('/:id/forfeit', authenticateToken, securityDepositController.forfeitDeposit);

// Partial release
router.post('/:id/partial-release', authenticateToken, securityDepositController.partialRelease);

// Calculate accrued interest
router.get('/:id/calculate-interest', authenticateToken, securityDepositController.calculateAccruedInterest);

// Delete security deposit (soft delete)
router.delete('/:id', authenticateToken, securityDepositController.deleteSecurityDeposit);

module.exports = router;
