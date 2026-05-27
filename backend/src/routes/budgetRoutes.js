const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const { authMiddleware } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);
router.use(resolveCompanyContext);

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
