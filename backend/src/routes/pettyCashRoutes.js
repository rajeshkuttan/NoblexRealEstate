const express = require('express');
const router = express.Router();
const pettyCashController = require('../controllers/pettyCashController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, pettyCashController.getAllTransactions);
router.get('/balance', authenticateToken, pettyCashController.getBalance);
router.get('/stats', authenticateToken, pettyCashController.getStats);
router.post('/', authenticateToken, pettyCashController.createTransaction);
router.post('/:id/approve', authenticateToken, pettyCashController.approveTransaction);
router.post('/:id/reject', authenticateToken, pettyCashController.rejectTransaction);

module.exports = router;
