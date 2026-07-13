const express = require('express');
const { authMiddleware, requirePermission, requireAnyPermission } = require('../../middleware/authMiddleware');
const { resolveCompanyContext } = require('../../middleware/resolveCompanyContext');
const ctrl = require('../controllers/copilotController');
const { createUploadMiddleware } = require('../ingestion/uploadMiddleware');

const router = express.Router();
const upload = createUploadMiddleware();

router.use(authMiddleware);
router.use(resolveCompanyContext);

router.get('/health', requirePermission('module:copilot:use'), ctrl.health);

router.use(ctrl.requireEnabled);

router.get('/conversations', requirePermission('module:copilot:use'), ctrl.listConversations);
router.post('/conversations', requirePermission('module:copilot:use'), ctrl.createConversation);
router.get('/conversations/:id', requirePermission('module:copilot:use'), ctrl.getConversation);
router.post('/conversations/:id/messages', requirePermission('module:copilot:use'), ctrl.postMessage);
router.post(
  '/conversations/:id/messages/stream',
  requirePermission('module:copilot:use'),
  ctrl.postMessageStream
);
router.post('/feedback', requirePermission('module:copilot:use'), ctrl.postFeedback);

router.get(
  '/documents',
  requireAnyPermission(['module:copilot:documents', 'module:copilot:use']),
  ctrl.listDocuments
);
router.get(
  '/documents/:id',
  requireAnyPermission(['module:copilot:documents', 'module:copilot:use']),
  ctrl.getDocument
);
router.post(
  '/documents',
  requirePermission('module:copilot:documents'),
  (req, res, next) => {
    upload(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, code: 'UPLOAD_ERROR', message: err.message });
      }
      return next();
    });
  },
  ctrl.uploadDocument
);
router.post('/documents/:id/reindex', requirePermission('module:copilot:documents'), ctrl.reindexDocument);
router.delete('/documents/:id', requirePermission('module:copilot:documents'), ctrl.deleteDocument);

router.post('/actions/confirm', requirePermission('module:copilot:use'), ctrl.confirmAction);
router.post(
  '/exports/answer-pdf',
  requirePermission('module:copilot:export'),
  ctrl.exportAnswerPdf
);
router.post(
  '/exports/tool-xlsx',
  requirePermission('module:copilot:export'),
  ctrl.exportToolXlsx
);
router.get('/admin/stats', requirePermission('module:copilot:admin'), ctrl.adminStats);
router.get('/context/resolve', requirePermission('module:copilot:use'), ctrl.resolveContext);
router.get(
  '/evaluations/cases',
  requireAnyPermission(['module:copilot:evaluate', 'module:copilot:admin']),
  ctrl.listEvaluationCases
);
router.post(
  '/evaluations/run',
  requireAnyPermission(['module:copilot:evaluate', 'module:copilot:admin']),
  ctrl.runEvaluations
);

module.exports = router;
