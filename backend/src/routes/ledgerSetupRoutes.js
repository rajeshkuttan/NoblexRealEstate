const express = require('express');
const router = express.Router();
const ledgerSetupController = require('../controllers/ledgerSetupController');
const { authenticateToken } = require('../middleware/auth'); // Import authentication middleware

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET all ledger setups
router.get('/', ledgerSetupController.getAllLedgerSetups);

// GET a single ledger setup by ID
router.get('/:id', ledgerSetupController.getLedgerSetupById);

// POST create a new ledger setup
router.post('/', ledgerSetupController.createLedgerSetup);

// PUT update an existing ledger setup
router.put('/:id', ledgerSetupController.updateLedgerSetup);

// DELETE a ledger setup
router.delete('/:id', ledgerSetupController.deleteLedgerSetup);

module.exports = router;
