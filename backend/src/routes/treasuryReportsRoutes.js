const express = require('express');
const router = express.Router();
const treasuryReportsController = require('../controllers/treasuryReportsController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


router.get('/cash-position', treasuryReportsController.getCashPositionReport);
router.get('/collections', treasuryReportsController.getCollectionsReport);
router.get('/dashboard', treasuryReportsController.getTreasuryDashboard);

module.exports = router;
