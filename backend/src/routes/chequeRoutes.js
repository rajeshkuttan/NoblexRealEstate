/**
 * Cheque Routes
 */

const express = require('express');
const router = express.Router();
const chequeController = require('../controllers/chequeController');
const { authenticateToken } = require('../middleware/auth');

// Get all cheques
router.get('/', authenticateToken, chequeController.getAllCheques);

// Get PDC register
router.get('/pdc-register', authenticateToken, chequeController.getPDCRegister);

// Get cheque statistics
router.get('/stats', authenticateToken, chequeController.getChequeStats);

// Get cheque by ID
router.get('/:id', authenticateToken, chequeController.getChequeById);

// Create cheque
router.post('/', authenticateToken, chequeController.createCheque);

// Update cheque
router.put('/:id', authenticateToken, chequeController.updateCheque);

// Deposit cheque
router.post('/:id/deposit', authenticateToken, chequeController.depositCheque);

// Clear cheque
router.post('/:id/clear', authenticateToken, chequeController.clearCheque);

// Bounce cheque
router.post('/:id/bounce', authenticateToken, chequeController.bounceCheque);

// Cancel cheque
router.post('/:id/cancel', authenticateToken, chequeController.cancelCheque);

// Replace bounced cheque
router.post('/:id/replace', authenticateToken, chequeController.replaceCheque);

// Delete cheque (soft delete)
router.delete('/:id', authenticateToken, chequeController.deleteCheque);

module.exports = router;
