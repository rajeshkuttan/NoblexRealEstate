const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

router.use(authenticateToken);
router.use(resolveCompanyContext);


router.get('/', investmentController.getAllInvestments);
router.get('/stats', investmentController.getInvestmentStats);
router.post('/', investmentController.createInvestment);
router.get('/:id/calculate-interest', investmentController.calculateInterest);

module.exports = router;
