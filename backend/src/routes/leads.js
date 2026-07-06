const express = require('express');
const router = express.Router();
const {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  updateLeadScore,
  addLeadActivity,
  getLeadAnalytics
} = require('../controllers/leadController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { resolveCompanyContext } = require('../middleware/resolveCompanyContext');
const { validateLead, validateLeadUpdate, validateId, validateQuery } = require('../middleware/validation');

// All routes require authentication
router.use(authenticateToken);
router.use(resolveCompanyContext);

// Lead analytics (admin/manager only)
router.get('/analytics', authorize('admin', 'manager'), getLeadAnalytics);

// Lead CRUD operations
router.get('/', validateQuery, getLeads);
router.get('/:id', validateId, getLead);
router.post('/', validateLead, createLead);
router.put('/:id', validateId, validateLeadUpdate, updateLead);
router.delete('/:id', validateId, deleteLead);

// Lead specific operations
router.put('/:id/score', validateId, updateLeadScore);
router.post('/:id/activities', validateId, addLeadActivity);

module.exports = router;
