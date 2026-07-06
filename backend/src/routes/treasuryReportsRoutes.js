const express = require('express');
const router = express.Router();
const treasuryReportsController = require('../controllers/treasuryReportsController');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/authMiddleware');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


router.get('/cash-position', treasuryReportsController.getCashPositionReport);
router.get('/collections', treasuryReportsController.getCollectionsReport);
router.get('/dashboard', treasuryReportsController.getTreasuryDashboard);
router.get('/investment-cash', requirePermission('module:investment:view'), treasuryReportsController.getInvestmentCashSummary);

module.exports = router;
