const express = require('express');
const router = express.Router();
const vatReturnController = require('../controllers/vatReturnController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);
router.get('/summary', vatReturnController.getQuarterSummary);
router.post('/suggest-jv', vatReturnController.suggestJournalVoucher);

module.exports = router;
