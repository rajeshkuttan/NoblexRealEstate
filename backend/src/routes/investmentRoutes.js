const express = require('express');
const router = express.Router();
const investmentController = require('../controllers/investmentController');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, investmentController.getAllInvestments);
router.get('/stats', authenticateToken, investmentController.getInvestmentStats);
router.post('/', authenticateToken, investmentController.createInvestment);
router.get('/:id/calculate-interest', authenticateToken, investmentController.calculateInterest);

module.exports = router;
