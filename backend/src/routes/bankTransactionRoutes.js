/**
 * Bank Transaction Routes
 * API routes for bank transaction management
 * Part of: Phase 3.2 - Treasury Management APIs
 */

const express = require('express');
const router = express.Router();
const bankTransactionController = require('../controllers/bankTransactionController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', bankTransactionController.getAllBankTransactions);
router.get('/stats', bankTransactionController.getTransactionStats);
router.get('/unreconciled/:bankAccountId', bankTransactionController.getUnreconciledTransactions);
router.get('/:id', bankTransactionController.getBankTransactionById);
router.post('/', bankTransactionController.createBankTransaction);
router.post('/import', bankTransactionController.importBankTransactions);
router.put('/:id', bankTransactionController.updateBankTransaction);
router.delete('/:id', bankTransactionController.deleteBankTransaction);

module.exports = router;

