const express = require('express');
const router = express.Router();
const vatReturnController = require('../controllers/vatReturnController');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.use(resolveCompanyContext);
router.get('/summary', vatReturnController.getQuarterSummary);
router.post('/suggest-jv', vatReturnController.suggestJournalVoucher);

module.exports = router;
