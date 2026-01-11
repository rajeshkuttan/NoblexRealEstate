/**
 * Bank Account Routes
 * API routes for bank account and treasury management
 * Part of: Phase 3.2 - Treasury Management APIs
 */

const express = require('express');
const router = express.Router();
const bankAccountController = require('../controllers/bankAccountController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', bankAccountController.getAllBankAccounts);
router.get('/stats', bankAccountController.getBankAccountStats);
router.get('/cash-position', bankAccountController.getCashPosition);
router.get('/:id', bankAccountController.getBankAccountById);
router.post('/', bankAccountController.createBankAccount);
router.put('/:id', bankAccountController.updateBankAccount);
router.delete('/:id', bankAccountController.deleteBankAccount);

module.exports = router;

