/**
 * Report Share Routes
 * API routes for report sharing functionality
 * Part of: Phase 2 - Report Sharing APIs
 */

const express = require('express');
const router = express.Router();
const reportShareController = require('../controllers/reportShareController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public route - no authentication required
router.get('/shared/:token', reportShareController.getSharedReport);

// Protected routes - authentication required
router.post('/share', authMiddleware, reportShareController.createShareLink);
router.get('/history', authMiddleware, reportShareController.getShareHistory);
router.delete('/shared/:id', authMiddleware, reportShareController.revokeShareLink);

module.exports = router;
