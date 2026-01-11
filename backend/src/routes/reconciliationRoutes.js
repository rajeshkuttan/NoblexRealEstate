const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Get all reconciliations
router.get('/', authenticateToken, async (req, res) => {
  res.json({ success: true, data: { reconciliations: [], pagination: { total: 0, page: 1, limit: 10, pages: 0 } } });
});

// Get reconciliation statistics
router.get('/stats', authenticateToken, async (req, res) => {
  res.json({ success: true, data: { total: 0, byStatus: {}, unreconciledTransactions: 0, thisMonth: 0 } });
});

// Auto-reconcile
router.post('/auto-reconcile', authenticateToken, async (req, res) => {
  res.json({ success: true, message: 'Auto-reconciliation feature coming soon', data: {} });
});

module.exports = router;
