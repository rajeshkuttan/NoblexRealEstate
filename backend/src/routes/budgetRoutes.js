const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Budget routes
router.get('/', budgetController.getAllBudgets);
router.get('/stats', budgetController.getBudgetStats);
router.get('/current-year', budgetController.getCurrentYearBudgets);
router.get('/:id', budgetController.getBudgetById);
router.post('/', budgetController.createBudget);
router.put('/:id', budgetController.updateBudget);
router.put('/:id/approve', budgetController.approveBudget);
router.delete('/:id', budgetController.deleteBudget);

module.exports = router;
