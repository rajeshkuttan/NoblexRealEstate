const express = require('express');
const router = express.Router();
const chartOfAccountController = require('../controllers/chartOfAccountController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Chart of Account routes
router.get('/', chartOfAccountController.getAllAccounts);
router.get('/hierarchy', chartOfAccountController.getAccountHierarchy);
router.get('/stats', chartOfAccountController.getAccountStats);
router.get('/:id', chartOfAccountController.getAccountById);
router.post('/', chartOfAccountController.createAccount);
router.put('/opening-balances', chartOfAccountController.updateOpeningBalances);
router.put('/:id', chartOfAccountController.updateAccount);
router.delete('/:id', chartOfAccountController.deleteAccount);

module.exports = router;
