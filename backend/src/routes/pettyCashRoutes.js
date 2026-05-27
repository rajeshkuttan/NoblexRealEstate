const express = require('express');
const router = express.Router();
const pettyCashController = require('../controllers/pettyCashController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


router.get('/', pettyCashController.getAllTransactions);
router.get('/balance', pettyCashController.getBalance);
router.get('/stats', pettyCashController.getStats);
router.post('/', pettyCashController.createTransaction);
router.post('/:id/approve', pettyCashController.approveTransaction);
router.post('/:id/reject', pettyCashController.rejectTransaction);

module.exports = router;
