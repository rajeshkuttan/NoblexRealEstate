const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { authenticateToken } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');

// Dashboard stats endpoint
router.get('/stats', authenticateToken, resolveCompanyContext, getDashboardStats);

module.exports = router;
