/**
 * Cheque Routes
 */

const express = require('express');
const router = express.Router();
const chequeController = require('../controllers/chequeController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


// Get all cheques
router.get('/', chequeController.getAllCheques);

// Get PDC register
router.get('/pdc-register', chequeController.getPDCRegister);

// PDC outstanding report
router.get('/reports/pdc-outstanding', chequeController.getPDCOutstanding);

// Opening balance import (no GL)
router.post('/opening-balance/import', chequeController.importOpeningBalance);

// Get cheque statistics
router.get('/stats', chequeController.getChequeStats);

// Get cheque by ID
router.get('/:id', chequeController.getChequeById);

// Create cheque
router.post('/', chequeController.createCheque);

// Update cheque
router.put('/:id', chequeController.updateCheque);

// Deposit cheque
router.post('/:id/deposit', chequeController.depositCheque);

// Clear cheque
router.post('/:id/clear', chequeController.clearCheque);

// Bounce cheque
router.post('/:id/bounce', chequeController.bounceCheque);

// Cancel cheque
router.post('/:id/cancel', chequeController.cancelCheque);

// Replace bounced cheque
router.post('/:id/replace', chequeController.replaceCheque);

// Delete cheque (soft delete)
router.delete('/:id', chequeController.deleteCheque);

module.exports = router;
