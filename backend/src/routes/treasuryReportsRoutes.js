const express = require('express');
const router = express.Router();
const treasuryReportsController = require('../controllers/treasuryReportsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/cash-position', authenticateToken, treasuryReportsController.getCashPositionReport);
router.get('/collections', authenticateToken, treasuryReportsController.getCollectionsReport);
router.get('/dashboard', authenticateToken, treasuryReportsController.getTreasuryDashboard);

module.exports = router;
