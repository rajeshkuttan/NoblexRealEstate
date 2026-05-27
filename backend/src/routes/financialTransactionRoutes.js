const express = require('express');
const router = express.Router();
const financialTransactionController = require('../controllers/financialTransactionController');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(resolveCompanyContext);

// Financial Transaction routes
router.get('/', financialTransactionController.getAllTransactions);
router.get('/stats', financialTransactionController.getTransactionStats);
router.get('/date-range', financialTransactionController.getTransactionsByDateRange);
router.get('/reference/:reference', financialTransactionController.getTransactionsByReference);
router.get('/:id', financialTransactionController.getTransactionById);
router.post('/', financialTransactionController.createTransaction);
router.put('/:id', financialTransactionController.updateTransaction);
router.put('/:id/approve', financialTransactionController.approveTransaction);
router.delete('/:id', financialTransactionController.deleteTransaction);

module.exports = router;
