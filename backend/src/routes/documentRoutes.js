/**
 * Document Routes
 * API routes for document management
 * Part of: Phase 2 - Document Management APIs
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authMiddleware } = require('../middleware/authMiddleware');

const multer = require('multer');

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

router.use(authMiddleware);

router.post('/upload', upload.single('file'), documentController.uploadDocument);
router.get('/:id/download', documentController.downloadDocument);
router.get('/:entityType/:entityId', documentController.getDocumentsByEntity);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
