/**
 * Document Routes
 * API routes for document management
 * Part of: Phase 2 - Document Management APIs
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/upload', documentController.uploadDocument);
router.get('/:entityType/:entityId', documentController.getDocumentsByEntity);
router.get('/:id/download', documentController.downloadDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
